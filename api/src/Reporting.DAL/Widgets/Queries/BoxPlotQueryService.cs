using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for a box-and-whisker chart: filtered, then grouped by the category
/// column and each group's values in the measure column reduced to a five-number
/// summary (min, Q1, median, Q3, max). Unlike bar's single SQL GROUP BY this needs
/// every value to compute quartiles, so the lightweight (category, series, value)
/// scalars are pulled back and summarised in memory. A series column, if set, splits
/// each category into a box per series. Whiskers reach the actual extremes, or 1.5×IQR
/// past the quartiles with the remainder returned as outlier points.
/// </summary>
public class BoxPlotQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands)
{
    /// <summary>
    /// Ceiling on rows scanned for one box-plot query. A box returns only its five-number summary,
    /// but every value must be pulled to compute the quartiles in memory, so a runaway dataset is
    /// capped here. Far past any group size where the summary would meaningfully shift.
    /// </summary>
    private const int MaxBoxPlotScanRows = 200_000;

    /// <summary>Ceiling on raw values returned per box for the jittered overlay — a shape-preserving
    /// sample, not every point, so a large group doesn't bloat the payload.</summary>
    private const int MaxBoxPointsPerGroup = 300;

    public async Task<BoxPlotQueryResultDto?> QueryForBoxPlotAsync(int id, BoxPlotQueryDto dto)
    {
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        var empty = new BoxPlotQueryResultDto { Id = dataset.Id, Name = dataset.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Bands sit on the value axis; a tolerance filter reuses the band on that axis to narrow
        // rows by the measure column before they're summarised into boxes.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.CategoryColumnId, dto.ValueColumnId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

        // A missing category or measure (nothing bound yet) yields an empty chart, the same
        // graceful no-op the other chart kinds give when their axes aren't set.
        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        if (categoryColumn is null)
        {
            return empty;
        }
        var categoryId = categoryColumn.Id;

        var valueColumn = columnsByRef.GetValueOrDefault(dto.ValueColumnId);
        if (valueColumn is null)
        {
            return empty;
        }
        var valueId = valueColumn.Id;

        // A sentinel id matches no cell, so with no series column every row falls into one
        // group whose key is "" — the single unlabelled series the client expects.
        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        var (projected, truncated, scannedCount) = await ScanAndProjectAsync(matching, categoryId, seriesId, valueId);

        // Values grouped by (category, series) to summarise one box at a time.
        var valuesByKey = projected
            .GroupBy(p => (p.Category, p.Series))
            .ToDictionary(group => group.Key, group => group.Select(item => item.Value).ToList());

        var numeric = categoryColumn.Type is DatasetColumnType.Int or DatasetColumnType.Double;
        var date = categoryColumn.Type is DatasetColumnType.DateTime;
        var naturalOrder = CategoryOrdering.NaturalOrder(projected, numeric, date);
        var categoryDates = CategoryOrdering.CategoryDates(projected, date);
        var categoryDateConfig = date ? categoryColumn.GetConfig() as DateColumnConfig : null;

        var sort = dto.Sort ?? new ChartSort();
        var orderedCategoryKeys = await CategorySorting.OrderedCategoryKeysAsync(
            matching, categoryId, valueId, projected, naturalOrder, sort, columnsByRef);
        var categoryIndex = orderedCategoryKeys
            .Select((key, position) => (key, position))
            .ToDictionary(entry => entry.key, entry => entry.position);

        var orderedSeriesKeys = projected
            .Select(p => p.Series)
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var series = orderedSeriesKeys
            .Select(seriesKey => BuildBoxPlotSeries(seriesKey, orderedCategoryKeys, categoryIndex, valuesByKey, seriesColumn, dto))
            .ToList();

        var orderedCategories = orderedCategoryKeys
            .Select(key => CategoryLabels.Format(key, categoryDates, categoryDateConfig))
            .ToList();

        return new BoxPlotQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Categories = orderedCategories,
            Series = series,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Truncated = truncated,
            ScannedRowCount = scannedCount
        };
    }

    /// <summary>
    /// Pulls only the cells each box needs — the category cell (its three typed forms fetched
    /// together in one subquery, not three), the series key, and the measure — then pivots them
    /// in memory. Capped so a runaway dataset can't be pulled wholesale into memory; the summary
    /// of a very large group is unaffected in practice. A read-only projection to scalars, so none
    /// of it is change-tracked. The value is never null here: the caller already required a
    /// numeric measure on every row.
    /// </summary>
    private static async Task<(List<GroupedValueProjection> Projected, bool Truncated, int ScannedCount)> ScanAndProjectAsync(
        IQueryable<DatasetRow> matching, int categoryId, int seriesId, int valueId)
    {
        // Only rows carrying a numeric measure can feed a box; a category with none simply
        // doesn't appear, matching bar's non-count behaviour.
        var rowsQuery = matching.Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null));

        var scanned = await rowsQuery
            .OrderBy(r => r.Id)
            .Take(MaxBoxPlotScanRows + 1)
            .Select(r => new
            {
                Category = r.Cells
                    .Where(c => c.ColumnId == categoryId)
                    .Select(c => new { c.StringValue, c.NumberValue, c.DateValue })
                    .FirstOrDefault(),
                Series = r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
            })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxBoxPlotScanRows);

        var projected = scanned
            .Select(r => new GroupedValueProjection
            {
                Category = r.Category?.StringValue ?? "",
                SortNumber = r.Category?.NumberValue,
                SortDate = r.Category?.DateValue,
                Series = (r.Series ?? "").Trim(),
                Value = r.Value ?? 0d
            })
            .ToList();

        return (projected, truncated, scanned.Count);
    }

    /// <summary>One series: one box per ordered category (or a gap when that series has no values
    /// there), plus the outliers each box's whiskers excluded.</summary>
    private static BoxPlotSeriesDto BuildBoxPlotSeries(
        string seriesKey,
        List<string> orderedCategoryKeys,
        Dictionary<string, int> categoryIndex,
        Dictionary<(string Category, string Series), List<double>> valuesByKey,
        DatasetColumn? seriesColumn,
        BoxPlotQueryDto dto)
    {
        var boxes = new List<BoxDto?>(orderedCategoryKeys.Count);
        var outliers = new List<BoxOutlierDto>();
        foreach (var categoryKey in orderedCategoryKeys)
        {
            if (!valuesByKey.TryGetValue((categoryKey, seriesKey), out var values) || values.Count == 0)
            {
                boxes.Add(null);
                continue;
            }

            var (box, groupOutliers) = Summarise(values, dto.Whisker, dto.WhiskerFactor, dto.IncludePoints);
            boxes.Add(box);
            foreach (var value in groupOutliers)
            {
                outliers.Add(new BoxOutlierDto { CategoryIndex = categoryIndex[categoryKey], Value = value });
            }
        }
        return new BoxPlotSeriesDto { Label = SeriesLabels.Format(seriesColumn, seriesKey), Boxes = boxes, Outliers = outliers };
    }

    /// <summary>
    /// Reduces one group's values to a box summary: the quartiles, the mean and (sample) standard
    /// deviation, and the whiskers. The whiskers reach the actual extremes (MinMax), the furthest
    /// values within <paramref name="factor"/>×IQR of the quartiles (Tukey), or within
    /// <paramref name="factor"/>×σ of the mean (StdDev); in the latter two, anything beyond the
    /// fence is returned as an outlier. Quartiles use linear interpolation between closest ranks
    /// (the type-7 / Excel PERCENTILE.INC method). When <paramref name="includePoints"/> is set the
    /// box also carries a capped, even sample of its raw values for the jittered overlay.
    /// </summary>
    private static (BoxDto Box, List<double> Outliers) Summarise(
        List<double> values, BoxWhisker whisker, double factor, bool includePoints)
    {
        values.Sort();
        var q1 = Statistics.Quantile(values, 0.25);
        var median = Statistics.Quantile(values, 0.5);
        var q3 = Statistics.Quantile(values, 0.75);
        var mean = values.Average();
        var stdDev = Statistics.StdDev(values, mean);

        double low, high;
        var outliers = new List<double>();
        if (whisker == BoxWhisker.MinMax)
        {
            low = values[0];
            high = values[^1];
        }
        else
        {
            // Tukey fences off the quartiles; StdDev fences off the mean. A non-positive factor
            // would collapse the fences onto the centre, so it's floored at zero.
            var factorFloor = Math.Max(0, factor);
            double lowerFence, upperFence;
            if (whisker == BoxWhisker.StdDev)
            {
                lowerFence = mean - factorFloor * stdDev;
                upperFence = mean + factorFloor * stdDev;
            }
            else
            {
                var iqr = q3 - q1;
                lowerFence = q1 - factorFloor * iqr;
                upperFence = q3 + factorFloor * iqr;
            }
            // Whiskers stop at the most extreme values still inside the fences.
            low = values.First(value => value >= lowerFence);
            high = values.Last(value => value <= upperFence);
            foreach (var value in values)
            {
                if (value < lowerFence || value > upperFence)
                {
                    outliers.Add(value);
                }
            }
        }

        var box = new BoxDto
        {
            Min = low, Q1 = q1, Median = median, Q3 = q3, Max = high,
            Mean = mean, StdDev = stdDev, Count = values.Count,
            Points = includePoints ? SamplePoints(values) : new List<double>()
        };
        return (box, outliers);
    }

    /// <summary>A capped, evenly-spaced sample of an already-sorted list — enough to show the
    /// distribution's shape in a jittered overlay without shipping every underlying value.</summary>
    private static List<double> SamplePoints(List<double> sorted)
    {
        if (sorted.Count <= MaxBoxPointsPerGroup)
        {
            return new List<double>(sorted);
        }

        var step = (double)sorted.Count / MaxBoxPointsPerGroup;
        var sample = new List<double>(MaxBoxPointsPerGroup);
        for (var i = 0; i < MaxBoxPointsPerGroup; i++)
        {
            sample.Add(sorted[(int)(i * step)]);
        }
        return sample;
    }
}
