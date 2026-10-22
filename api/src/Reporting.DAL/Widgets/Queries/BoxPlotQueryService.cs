using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Each category's (and series') measure values reduced to a five-number summary, with whiskers and outliers.
/// Quartiles need every value, so the scalars are pulled back and summarised in memory.
/// </summary>
public class BoxPlotQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
{
    public async Task<BoxPlotQueryResultDto?> QueryForBoxPlotAsync(int id, BoxPlotQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Bands sit on the value axis, which a tolerance filter reuses.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.CategoryColumnId, dto.ValueColumnId);
        var filtered = await WidgetRowFilter.FilterAsync(db, resolved, columnsByRef, dto.Filter, toleranceByColumn);

        var result = new BoxPlotQueryResultDto
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
        await ApplyBoxesAsync(result, filtered.Matching, dto, reader, valueColumn.Id, columnsByRef, dataset.Columns);
        result.ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds);
        return result;
    }

    private static async Task ApplyBoxesAsync(
        BoxPlotQueryResultDto result, IQueryable<DatasetRow> matching, BoxPlotQueryDto dto, ChartCategoryReader reader, int valueId,
        Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> allColumns)
    {
        // With no series column, id 0 matches no cell, so every row falls in the one unlabelled series "".
        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        var (projected, truncated, scannedCount) = await BoxPlotScan.ValuesAsync(matching, reader, seriesId, valueId);
        var valuesByKey = projected
            .GroupBy(p => (p.Category, p.Series))
            .ToDictionary(group => group.Key, group => group.Select(item => item.Value).ToList());
        var categories = projected.Select(p => p.CategoryValue).DistinctBy(c => c.Key).ToDictionary(c => c.Key);

        var naturalOrder = reader.NaturalOrder(categories.Values).Select(c => c.Key).ToList();
        var orderedCategoryKeys = await CategorySorting.OrderedCategoryKeysAsync(
            matching, reader, valueId, projected, naturalOrder, dto.Sort ?? new ChartSort(), columnsByRef);
        var orderedSeriesKeys = projected
            .Select(p => p.Series)
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var series = orderedSeriesKeys
            .Select(seriesKey => BoxPlotSeries.Build(seriesKey, orderedCategoryKeys, valuesByKey, seriesColumn, dto))
            .ToList();
        await BoxPlotSeries.AddTooltipsAsync(
            series, matching, reader, seriesId, orderedCategoryKeys, orderedSeriesKeys, dto, columnsByRef, allColumns);

        result.Categories = orderedCategoryKeys.Select(key => reader.Label(categories[key])).ToList();
        result.CategoryDetails = orderedCategoryKeys.Select(key => reader.Detail(categories[key])).ToList();
        result.Series = series;
        result.Truncated = truncated;
        result.ScannedRowCount = scannedCount;
    }
}
