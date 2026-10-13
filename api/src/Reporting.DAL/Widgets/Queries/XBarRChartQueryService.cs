using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for an Xbar-R control chart: filtered, grouped by the subgroup column, and each
/// subgroup's measure values reduced to a mean and a range. The grand mean of the subgroup means
/// and the average subgroup range (pooled only from subgroups of two or more — a lone value has
/// no meaningful range) become the two charts' centre lines; each subgroup's own control limits
/// are then derived from those via the Shewhart constants for its own size, so unequal subgroup
/// sizes still produce statistically correct (if stepped) limits.
/// </summary>
public class XBarRChartQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands)
{
    /// <summary>
    /// Ceiling on rows scanned for one Xbar-R query. Like a box plot every value must be pulled to
    /// compute each subgroup's mean and range in memory, so a runaway dataset is capped here.
    /// </summary>
    private const int MaxXBarRScanRows = 200_000;

    public async Task<XBarRChartQueryResultDto?> QueryForXBarRChartAsync(int id, XBarRChartQueryDto dto)
    {
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        var empty = new XBarRChartQueryResultDto { Id = dataset.Id, Name = dataset.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // The band sits on the X-bar (measure) axis; a tolerance filter reuses it to narrow rows
        // by the measure column before they're pooled into subgroups.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.CategoryColumnId, dto.ValueColumnId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

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

        var (projected, truncated, scannedCount) = await ScanAndProjectAsync(matching, categoryId, valueId);
        if (projected.Count == 0)
        {
            return empty;
        }

        var valuesByCategory = projected
            .GroupBy(p => p.Category)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Value).ToList());

        // The category column's own order first — the same rule a box plot's categories follow.
        var numeric = categoryColumn.Type is DatasetColumnType.Int or DatasetColumnType.Double;
        var date = categoryColumn.Type is DatasetColumnType.DateTime;
        var naturalOrder = CategoryOrdering.NaturalOrder(projected, numeric, date);
        var categoryDates = CategoryOrdering.CategoryDates(projected, date);
        var categoryDateConfig = date ? categoryColumn.GetConfig() as DateColumnConfig : null;

        var sort = dto.Sort ?? new ChartSort();
        var orderedCategoryKeys = await CategorySorting.OrderedCategoryKeysAsync(
            matching, categoryId, valueId, projected, naturalOrder, sort, columnsByRef);

        // Each subgroup's own mean and range, before the control limits (which need the grand mean
        // and average range across all of them first) can be computed.
        var stats = orderedCategoryKeys.Select(key => SubgroupStat(valuesByCategory[key])).ToList();

        var xBarBar = stats.Average(stat => stat.Mean);
        // A subgroup of one has a range of zero by construction, not because the process is
        // perfectly consistent — including it would bias the average range low, so only subgroups
        // of two or more contribute to it.
        var ranged = stats.Where(stat => stat.Count >= 2).ToList();
        var rBar = ranged.Count > 0 ? ranged.Average(stat => stat.Range) : 0d;

        var subgroups = stats.Select(stat => BuildSubgroup(stat, xBarBar, rBar)).ToList();
        var orderedCategories = orderedCategoryKeys
            .Select(key => CategoryLabels.Format(key, categoryDates, categoryDateConfig))
            .ToList();

        return new XBarRChartQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Categories = orderedCategories,
            Subgroups = subgroups,
            XBarCenterLine = xBarBar,
            RCenterLine = rBar,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Truncated = truncated,
            ScannedRowCount = scannedCount
        };
    }

    /// <summary>
    /// Pulls only the cells each subgroup needs — the category cell (its three typed forms fetched
    /// together in one subquery, not three) and the measure — then pivots them in memory. Only
    /// rows carrying a numeric measure can feed a subgroup; a subgroup with none simply doesn't
    /// appear, matching box plot's behaviour. Capped so a runaway dataset can't be pulled wholesale
    /// into memory.
    /// </summary>
    private static async Task<(List<GroupedValueProjection> Projected, bool Truncated, int ScannedCount)> ScanAndProjectAsync(
        IQueryable<DatasetRow> matching, int categoryId, int valueId)
    {
        var rowsQuery = matching.Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null));

        var scanned = await rowsQuery
            .OrderBy(r => r.Id)
            .Take(MaxXBarRScanRows + 1)
            .Select(r => new
            {
                Category = r.Cells
                    .Where(c => c.ColumnId == categoryId)
                    .Select(c => new { c.StringValue, c.NumberValue, c.DateValue })
                    .FirstOrDefault(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
            })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxXBarRScanRows);

        var projected = scanned
            .Select(r => new GroupedValueProjection
            {
                Category = r.Category?.StringValue ?? "",
                SortNumber = r.Category?.NumberValue,
                SortDate = r.Category?.DateValue,
                Value = r.Value ?? 0d
            })
            .ToList();

        return (projected, truncated, scanned.Count);
    }

    /// <summary>One subgroup's mean, range (max − min) and row count, ahead of the control limits.</summary>
    private static (double Mean, double Range, int Count) SubgroupStat(List<double> values) =>
        (values.Average(), values.Max() - values.Min(), values.Count);

    /// <summary>
    /// One subgroup's control-limit verdict: its own Shewhart constants (by its size) applied to
    /// the shared grand mean and average range, and whether its mean or range breaches them.
    /// </summary>
    private static XBarRSubgroupDto BuildSubgroup((double Mean, double Range, int Count) stat, double xBarBar, double rBar)
    {
        var (a2, d3, d4) = ControlChartConstants.Lookup(stat.Count);
        var xUcl = xBarBar + a2 * rBar;
        var xLcl = xBarBar - a2 * rBar;
        var rUcl = d4 * rBar;
        var rLcl = d3 * rBar;
        return new XBarRSubgroupDto
        {
            Mean = stat.Mean,
            Range = stat.Range,
            Count = stat.Count,
            XBarUcl = xUcl,
            XBarLcl = xLcl,
            RUcl = rUcl,
            RLcl = rLcl,
            MeanOutOfControl = stat.Mean > xUcl || stat.Mean < xLcl,
            RangeOutOfControl = stat.Count >= 2 && (stat.Range > rUcl || stat.Range < rLcl)
        };
    }
}
