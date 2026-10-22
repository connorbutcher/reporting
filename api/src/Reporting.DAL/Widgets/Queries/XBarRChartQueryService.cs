using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// A control chart (Xbar-R, Xbar-S, individuals, p or np): rows grouped by the subgroup column and reduced
/// to a plotted value and dispersion per point, with limits from the Shewhart constants and Nelson rule flags.
/// </summary>
public class XBarRChartQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
{
    public async Task<XBarRChartQueryResultDto?> QueryForXBarRChartAsync(int id, XBarRChartQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // The band sits on the measure axis, which a tolerance filter reuses.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.CategoryColumnId, dto.ValueColumnId);
        var filtered = await WidgetRowFilter.FilterAsync(db, resolved, columnsByRef, dto.Filter, toleranceByColumn);

        var result = new XBarRChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            TotalRowCount = filtered.TotalRowCount,
            MatchedRowCount = filtered.MatchedRowCount
        };
        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        var valueColumn = columnsByRef.GetValueOrDefault(dto.ValueColumnId);
        if (categoryColumn is null || valueColumn is null)
        {
            return result;
        }

        var reader = new ChartCategoryReader(categoryColumn, dto.CategoryGrouping);
        if (await ApplyPointsAsync(result, filtered.Matching, dto, reader, valueColumn.Id, columnsByRef))
        {
            result.ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds);
        }
        return result;
    }

    /// <summary>False, leaving <paramref name="result"/> empty, when no row has a value.</summary>
    private static async Task<bool> ApplyPointsAsync(
        XBarRChartQueryResultDto result, IQueryable<DatasetRow> matching, XBarRChartQueryDto dto, ChartCategoryReader reader,
        int valueId, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var (projected, truncated, scannedCount) = await XBarRScan.ValuesAsync(matching, reader, valueId);
        if (projected.Count == 0)
        {
            return false;
        }

        var valuesByCategory = projected
            .GroupBy(p => p.Category)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Value).ToList());
        var categories = projected.Select(p => p.CategoryValue).DistinctBy(c => c.Key).ToDictionary(c => c.Key);

        var naturalOrder = reader.NaturalOrder(categories.Values).Select(c => c.Key).ToList();
        var orderedCategoryKeys = await CategorySorting.OrderedCategoryKeysAsync(
            matching, reader, valueId, projected, naturalOrder, dto.Sort ?? new ChartSort(), columnsByRef);

        // Individuals plot every row as its own point; the other charts one point per subgroup.
        var pointKeys = dto.Mode == ControlChartMode.Individuals
            ? orderedCategoryKeys.SelectMany(key => valuesByCategory[key].Select(_ => key)).ToList()
            : orderedCategoryKeys;
        var stats = ControlChartStats.For(dto.Mode, orderedCategoryKeys, valuesByCategory);

        var baseline = dto.BaselineSubgroups is > 0 and var n && n < stats.Count ? n : (int?)null;
        var basis = baseline is { } count ? stats.Take(count).ToList() : stats;
        var limits = ControlChartLimits.Build(stats, basis, dto.Mode);
        limits.ApplyRules(dto.RunRules);

        result.Categories = pointKeys.Select(key => reader.Label(categories[key])).ToList();
        result.CategoryDetails = pointKeys.Select(key => reader.Detail(categories[key])).ToList();
        result.Subgroups = limits.Subgroups;
        result.XBarCenterLine = limits.XBarBar;
        result.RCenterLine = limits.DispersionBar;
        result.Mode = dto.Mode;
        result.BaselineCount = baseline;
        result.Truncated = truncated;
        result.ScannedRowCount = scannedCount;
        return true;
    }
}
