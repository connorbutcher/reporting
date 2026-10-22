using Reporting.Abstractions;
using Reporting.DAL.Filtering;
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

        var empty = new BoxPlotQueryResultDto { Id = resolved.Id, Name = resolved.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Bands sit on the value axis, which a tolerance filter reuses.
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

        // With no series column, id 0 matches no cell, so every row falls in the one unlabelled series "".
        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        var (projected, truncated, scannedCount) = await BoxPlotScan.ValuesAsync(matching, reader, seriesId, valueId);

        var valuesByKey = projected
            .GroupBy(p => (p.Category, p.Series))
            .ToDictionary(group => group.Key, group => group.Select(item => item.Value).ToList());

        var categories = projected.Select(p => p.CategoryValue).DistinctBy(c => c.Key).ToDictionary(c => c.Key);
        var naturalOrder = reader.NaturalOrder(categories.Values).Select(c => c.Key).ToList();

        var sort = dto.Sort ?? new ChartSort();
        var orderedCategoryKeys = await CategorySorting.OrderedCategoryKeysAsync(
            matching, reader, valueId, projected, naturalOrder, sort, columnsByRef);

        var orderedSeriesKeys = projected
            .Select(p => p.Series)
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var series = orderedSeriesKeys
            .Select(seriesKey => BoxPlotSeries.Build(seriesKey, orderedCategoryKeys, valuesByKey, seriesColumn, dto))
            .ToList();

        await BoxPlotSeries.AddTooltipsAsync(
            series, matching, reader, seriesId, orderedCategoryKeys, orderedSeriesKeys, dto, columnsByRef, dataset.Columns);

        var orderedCategories = orderedCategoryKeys.Select(key => reader.Label(categories[key])).ToList();

        return new BoxPlotQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Categories = orderedCategories,
            CategoryDetails = orderedCategoryKeys.Select(key => reader.Detail(categories[key])).ToList(),
            Series = series,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Truncated = truncated,
            ScannedRowCount = scannedCount
        };
    }
}
