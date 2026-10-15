using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for a bar chart: filtered, then grouped by the category column
/// and reduced to one value per category (per series) by the chosen aggregate.
/// Unlike scatter/line this returns categories plus a value-per-category array
/// for each series, already aligned so the client can drop them straight onto a
/// category axis. The grouping and reduction run as a single SQL GROUP BY, so
/// only the aggregated rows (one per category/series) come back rather than every
/// underlying row.
/// </summary>
public class BarChartQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
{
    public async Task<BarChartQueryResultDto?> QueryForBarChartAsync(int id, BarChartQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var empty = new BarChartQueryResultDto { Id = resolved.Id, Name = resolved.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        var isCount = dto.Aggregate == Aggregate.Count;

        // The measures to plot, in request order — several become several series per category,
        // grouped or stacked. The deprecated single ValueColumnId folds in when the list is empty.
        var valueColumnIds = dto.ValueColumnIds.Count > 0
            ? dto.ValueColumnIds
            : (dto.ValueColumnId is { } single ? new List<Guid> { single } : new List<Guid>());

        // Bands sit on the value (Y) axis; a tolerance filter reuses the band on that axis to
        // narrow rows by the measure column before they're aggregated into bars. With several
        // measures the first stands in — a per-measure tolerance filter isn't expressible here.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(
            dto.ToleranceBands, bounds, dto.CategoryColumnId, valueColumnIds.FirstOrDefault());
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

        // A missing category (nothing bound yet) yields an empty chart, the same graceful
        // no-op scatter/line give when their axes aren't set.
        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        if (categoryColumn is null)
        {
            return empty;
        }
        var categoryId = categoryColumn.Id;

        // Count needs no measure — it reduces to one implicit series (null column). Every other
        // aggregate reduces each bound value column into its own series; unknown ids drop out.
        var measures = isCount
            ? new List<DatasetColumn?> { null }
            : valueColumnIds
                .Select(valueColumnId => columnsByRef.GetValueOrDefault(valueColumnId))
                .Where(c => c is not null)
                .ToList();
        if (measures.Count == 0)
        {
            return empty;
        }

        // A sentinel id matches no cell, so with no series column every row falls into one
        // group whose key is "" — the single unlabelled series the client expects.
        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        // Aggregate every measure, keeping each measure's groups tagged with the column they came from.
        var perMeasure = new List<(DatasetColumn? Column, List<BarGroup> Groups)>();
        foreach (var measure in measures)
        {
            var groups = await AggregateMeasureAsync(matching, dto.Aggregate, isCount, categoryId, seriesId, measure?.Id ?? 0);
            perMeasure.Add((measure, groups));
        }
        var allGroups = perMeasure.SelectMany(m => m.Groups).ToList();

        // The category column's own order first: numerically/chronologically for numeric and date
        // columns (blanks, whose sort key is null, sink to the end), alphabetically otherwise.
        var numeric = categoryColumn.Type is DatasetColumnType.Int or DatasetColumnType.Double;
        var date = categoryColumn.Type is DatasetColumnType.DateTime;
        var naturalOrder = NaturalCategoryOrder(allGroups, numeric, date);

        // A column sort re-ranks by a chosen column's aggregate (possibly a column that isn't even
        // plotted); an unresolvable column — a stale reference — falls back to the natural order
        // rather than blanking the chart. Either way `Descending` can still reverse the result.
        var sort = dto.Sort ?? new ChartSort();
        List<string> orderedCategoryKeys;
        if (sort.By == ChartSortBy.Column && sort.ColumnId is { } sortColumnRef
            && columnsByRef.GetValueOrDefault(sortColumnRef) is { } sortColumn)
        {
            var metrics = await CategorySorting.CategorySortMetricsAsync(matching, categoryId, sortColumn, sort.Aggregate);
            orderedCategoryKeys = CategorySorting.OrderByMetric(naturalOrder, metrics, sort.Descending);
        }
        else
        {
            orderedCategoryKeys = sort.Descending ? Enumerable.Reverse(naturalOrder).ToList() : naturalOrder;
        }

        // One series per (measure × split key), measure-major so a measure's split series sit together.
        var series = perMeasure
            .SelectMany(measure => SeriesForMeasure(measure.Column, measure.Groups, seriesColumn, orderedCategoryKeys))
            .ToList();

        var orderedCategories = orderedCategoryKeys
            .Select(key => key.Length == 0 ? "(blank)" : key)
            .ToList();

        return new BarChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Categories = orderedCategories,
            Series = series,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount
        };
    }

    /// <summary>
    /// Reduces one measure into its (category, series) groups — a single SQL GROUP BY. Count
    /// ignores the measure and counts rows; every other aggregate reduces only rows that carry a
    /// numeric measure, so a category with none simply doesn't appear (SUM/MIN/MAX/AVG have
    /// nothing to reduce there).
    /// </summary>
    private static async Task<List<BarGroup>> AggregateMeasureAsync(
        IQueryable<DatasetRow> matching, Aggregate aggregate, bool isCount, int categoryId, int seriesId, int valueId)
    {
        var rowsQuery = isCount
            ? matching
            : matching.Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null));

        // One scalar row per dataset row — its category, a typed sort key, its series, and its
        // measure — pivoted out of the cell table so the group-by below is a plain GROUP BY.
        // Category null/"" collapse to "" here (COALESCE) so they group as one blank bar; the
        // series is trimmed to match, and both are turned into display labels after grouping.
        var projected = rowsQuery.Select(r => new BarProjection
        {
            Category = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.StringValue).FirstOrDefault() ?? "",
            SortNumber = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.NumberValue).FirstOrDefault(),
            SortDate = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.DateValue).FirstOrDefault(),
            Series = (r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault() ?? "").Trim(),
            Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
        });

        var grouped = projected.GroupBy(item => new { item.Category, item.Series });

        // Each aggregate is a different SQL reducer, so the whole GROUP BY is built per kind.
        // The min sort keys are constant within a category, so MIN just carries them through.
        IQueryable<BarGroup> query = aggregate switch
        {
            Aggregate.Count => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(item => item.SortNumber), SortDate = g.Min(item => item.SortDate),
                Value = g.Count()
            }),
            Aggregate.Sum => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(item => item.SortNumber), SortDate = g.Min(item => item.SortDate),
                Value = g.Sum(item => item.Value)
            }),
            Aggregate.Average => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(item => item.SortNumber), SortDate = g.Min(item => item.SortDate),
                Value = g.Average(item => item.Value)
            }),
            Aggregate.Min => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(item => item.SortNumber), SortDate = g.Min(item => item.SortDate),
                Value = g.Min(item => item.Value)
            }),
            Aggregate.Max => grouped.Select(g => new BarGroup
            {
                Category = g.Key.Category, Series = g.Key.Series,
                SortNumber = g.Min(item => item.SortNumber), SortDate = g.Min(item => item.SortDate),
                Value = g.Max(item => item.Value)
            }),
            _ => throw new FilterException($"Unsupported aggregate '{aggregate}'.")
        };

        return await query.ToListAsync();
    }

    /// <summary>The category column's own order: numerically/chronologically for numeric and date
    /// columns (blanks, whose sort key is null, sink to the end), alphabetically otherwise.</summary>
    private static List<string> NaturalCategoryOrder(List<BarGroup> allGroups, bool numeric, bool date)
    {
        var byCategory = allGroups
            .GroupBy(g => g.Category)
            .Select(g => new
            {
                Category = g.Key,
                Sort = numeric ? g.Min(item => item.SortNumber)
                    : date ? g.Min(item => item.SortDate)?.Ticks
                    : null
            });

        return (numeric || date)
            ? byCategory.OrderBy(c => c.Sort ?? double.MaxValue).Select(c => c.Category).ToList()
            : byCategory.Select(c => c.Category).OrderBy(category => category, StringComparer.OrdinalIgnoreCase).ToList();
    }

    /// <summary>One measure's series — one per distinct series key it produced, each carrying a
    /// value per ordered category (missing combinations left as a gap, not zero).</summary>
    private static IEnumerable<BarSeriesDto> SeriesForMeasure(
        DatasetColumn? measureColumn, List<BarGroup> groups, DatasetColumn? seriesColumn, List<string> orderedCategoryKeys)
    {
        var valueByKey = groups.ToDictionary(g => (g.Category, g.Series), g => g.Value);
        var seriesKeys = groups
            .Select(g => g.Series)
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return seriesKeys.Select(seriesKey => new BarSeriesDto
        {
            Label = SeriesLabels.Format(seriesColumn, seriesKey),
            ValueColumnId = measureColumn?.RefId,
            ValueColumnLabel = measureColumn?.Name ?? "",
            Values = orderedCategoryKeys
                .Select(categoryKey => valueByKey.GetValueOrDefault((categoryKey, seriesKey)))
                .ToList()
        });
    }
}
