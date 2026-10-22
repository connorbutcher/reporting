using Reporting.Abstractions;
using Reporting.DAL.Filtering;
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

        var empty = new XBarRChartQueryResultDto { Id = resolved.Id, Name = resolved.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // The band sits on the measure axis, which a tolerance filter reuses.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.CategoryColumnId, dto.ValueColumnId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        if (categoryColumn is null)
        {
            return empty;
        }
        var reader = new ChartCategoryReader(categoryColumn, dto.CategoryGrouping);

        var valueColumn = columnsByRef.GetValueOrDefault(dto.ValueColumnId);
        if (valueColumn is null)
        {
            return empty;
        }
        var valueId = valueColumn.Id;

        var (projected, truncated, scannedCount) = await XBarRScan.ValuesAsync(matching, reader, valueId);
        if (projected.Count == 0)
        {
            return empty;
        }

        var valuesByCategory = projected
            .GroupBy(p => p.Category)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Value).ToList());
        var categories = projected.Select(p => p.CategoryValue).DistinctBy(c => c.Key).ToDictionary(c => c.Key);

        var naturalOrder = reader.NaturalOrder(categories.Values).Select(c => c.Key).ToList();
        var sort = dto.Sort ?? new ChartSort();
        var orderedCategoryKeys = await CategorySorting.OrderedCategoryKeysAsync(
            matching, reader, valueId, projected, naturalOrder, sort, columnsByRef);

        // Individuals plot every row as its own point; the other charts one point per subgroup.
        var pointKeys = dto.Mode == ControlChartMode.Individuals
            ? orderedCategoryKeys.SelectMany(key => valuesByCategory[key].Select(_ => key)).ToList()
            : orderedCategoryKeys;
        var stats = ControlChartStats.For(dto.Mode, orderedCategoryKeys, valuesByCategory);

        var baseline = dto.BaselineSubgroups is > 0 and var n && n < stats.Count ? n : (int?)null;
        var basis = baseline is { } count ? stats.Take(count).ToList() : stats;
        var limits = ControlChartLimits.Build(stats, basis, dto.Mode);
        limits.ApplyRules(dto.RunRules);

        return new XBarRChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Categories = pointKeys.Select(key => reader.Label(categories[key])).ToList(),
            CategoryDetails = pointKeys.Select(key => reader.Detail(categories[key])).ToList(),
            Subgroups = limits.Subgroups,
            XBarCenterLine = limits.XBarBar,
            RCenterLine = limits.DispersionBar,
            Mode = dto.Mode,
            BaselineCount = baseline,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Truncated = truncated,
            ScannedRowCount = scannedCount
        };
    }
}
