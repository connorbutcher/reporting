using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows grouped by the category column and reduced per category (per series) by the chosen aggregate,
/// returned as categories plus an aligned value array per series. The grouping is one SQL GROUP BY on the
/// category's typed value, merged in memory into date periods and, for a Top N sort, an "Other" category.
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

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var valueColumnIds = ValueColumnIds(dto);

        // Bands sit on the value axis; with several measures the first stands in for a tolerance filter.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(
            dto.ToleranceBands, bounds, dto.CategoryColumnId, valueColumnIds.FirstOrDefault());
        var filtered = await WidgetRowFilter.FilterAsync(db, resolved, columnsByRef, dto.Filter, toleranceByColumn);

        var result = new BarChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            TotalRowCount = filtered.TotalRowCount,
            MatchedRowCount = filtered.MatchedRowCount
        };
        var categoryColumn = columnsByRef.GetValueOrDefault(dto.CategoryColumnId);
        var measures = Measures(dto, valueColumnIds, columnsByRef);
        if (categoryColumn is null || measures.Count == 0)
        {
            return result;
        }

        var reader = new ChartCategoryReader(categoryColumn, dto.CategoryGrouping);
        await ApplyBarsAsync(result, filtered.Matching, dto, reader, measures, columnsByRef, dataset.Columns);
        result.ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds);
        return result;
    }

    private static async Task ApplyBarsAsync(
        BarChartQueryResultDto result, IQueryable<DatasetRow> matching, BarChartQueryDto dto, ChartCategoryReader reader,
        List<DatasetColumn?> measures, Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> allColumns)
    {
        // With no series column, id 0 matches no cell, so every row falls in the one unlabelled series "".
        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        var categories = new Dictionary<string, ChartCategory>();
        var perMeasure = new List<BarMeasureStats>();
        foreach (var measure in measures)
        {
            var stats = await BarAggregation.AggregateAsync(matching, reader, categories, measure is null, seriesId, measure?.Id ?? 0);
            perMeasure.Add(new BarMeasureStats(measure, stats));
        }

        var sort = dto.Sort ?? new ChartSort();
        var orderedKeys = await OrderCategoriesAsync(matching, reader, categories, sort, columnsByRef);
        var tooltipStats = await TooltipStatsAsync(matching, reader, categories, seriesId, dto, columnsByRef, allColumns);
        orderedKeys = ApplyTopN(orderedKeys, sort, categories, perMeasure, tooltipStats);

        result.Categories = orderedKeys.Select(key => reader.Label(categories[key])).ToList();
        result.CategoryDetails = orderedKeys.Select(key => reader.Detail(categories[key])).ToList();
        result.Series = Series(perMeasure, orderedKeys, tooltipStats, seriesColumn, dto.Aggregate);
    }

    /// <summary>In request order; the deprecated single ValueColumnId folds in when the list is empty.</summary>
    private static List<Guid> ValueColumnIds(BarChartQueryDto dto)
    {
        if (dto.ValueColumnIds.Count > 0)
        {
            return dto.ValueColumnIds;
        }
        return dto.ValueColumnId is { } single ? new List<Guid> { single } : new List<Guid>();
    }

    /// <summary>Count reduces one implicit series (a null column); every other aggregate one series per known column.</summary>
    private static List<DatasetColumn?> Measures(BarChartQueryDto dto, List<Guid> valueColumnIds, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        if (dto.Aggregate == Aggregate.Count)
        {
            return new List<DatasetColumn?> { null };
        }
        return valueColumnIds
            .Select(valueColumnId => columnsByRef.GetValueOrDefault(valueColumnId))
            .Where(c => c is not null)
            .ToList();
    }

    /// <summary>
    /// A column sort ranks by any column's aggregate, plotted or not; a stale column falls back to the natural
    /// order. Either way Descending can reverse it.
    /// </summary>
    private static async Task<List<string>> OrderCategoriesAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, Dictionary<string, ChartCategory> categories,
        ChartSort sort, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var naturalOrder = reader.NaturalOrder(categories.Values).Select(c => c.Key).ToList();
        if (sort.By == ChartSortBy.Column && sort.ColumnId is { } sortColumnRef
            && columnsByRef.GetValueOrDefault(sortColumnRef) is { } sortColumn)
        {
            var metrics = await CategorySorting.CategorySortMetricsAsync(matching, reader, sortColumn, sort.Aggregate);
            return CategorySorting.OrderByMetric(naturalOrder, metrics, sort.Descending);
        }
        return sort.Descending ? Enumerable.Reverse(naturalOrder).ToList() : naturalOrder;
    }

    private static async Task<List<BarTooltipStats>> TooltipStatsAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, Dictionary<string, ChartCategory> categories, int seriesId,
        BarChartQueryDto dto, Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> allColumns)
    {
        var tooltipStats = new List<BarTooltipStats>();
        foreach (var setting in dto.TooltipColumns)
        {
            var column = TooltipColumns.Resolve(setting, columnsByRef, allColumns);
            if (column?.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            {
                continue;
            }
            var stats = await BarAggregation.AggregateAsync(matching, reader, categories, false, seriesId, column.Id);
            tooltipStats.Add(new BarTooltipStats(setting, column, stats));
        }
        return tooltipStats;
    }

    /// <summary>Keeps the first N in order; with ShowOther the rest merge into one "Other" category.</summary>
    private static List<string> ApplyTopN(
        List<string> orderedKeys, ChartSort sort, Dictionary<string, ChartCategory> categories,
        List<BarMeasureStats> perMeasure, List<BarTooltipStats> tooltipStats)
    {
        if (sort.Limit is not (> 0 and var limit) || orderedKeys.Count <= limit)
        {
            return orderedKeys;
        }

        var rest = orderedKeys.Skip(limit).ToHashSet();
        var kept = orderedKeys.Take(limit).ToList();
        if (sort.ShowOther)
        {
            foreach (var measure in perMeasure)
            {
                BarAggregation.MergeIntoOther(measure.Stats, rest);
            }
            foreach (var tooltip in tooltipStats)
            {
                BarAggregation.MergeIntoOther(tooltip.Stats, rest);
            }
            categories[ChartCategory.OtherKey] = ChartCategory.Other;
            kept.Add(ChartCategory.OtherKey);
        }
        return kept;
    }

    /// <summary>One series per measure and split key, measure-major so a measure's split series sit together.</summary>
    private static List<BarSeriesDto> Series(
        List<BarMeasureStats> perMeasure, List<string> orderedKeys, List<BarTooltipStats> tooltipStats,
        DatasetColumn? seriesColumn, Aggregate aggregate)
    {
        var seriesKeys = perMeasure
            .SelectMany(m => m.Stats.Keys.Select(k => k.Series))
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var tooltipAggregate = aggregate == Aggregate.Count ? Aggregate.Sum : aggregate;

        return perMeasure
            .SelectMany(measure => seriesKeys
                .Where(seriesKey => measure.Stats.Keys.Any(k => k.Series == seriesKey))
                .Select(seriesKey => new BarSeriesDto
                {
                    Label = SeriesLabels.Format(seriesColumn, seriesKey),
                    Drill = SeriesLabels.Drill(seriesColumn, seriesKey),
                    ValueColumnId = measure.Column?.RefId,
                    ValueColumnLabel = measure.Column?.Name ?? "",
                    Values = orderedKeys
                        .Select(key => measure.Stats.TryGetValue((key, seriesKey), out var s) ? s.Value(aggregate) : null)
                        .ToList(),
                    RowCounts = orderedKeys
                        .Select(key => measure.Stats.TryGetValue((key, seriesKey), out var s) ? (int?)s.Count : null)
                        .ToList(),
                    TooltipLines = tooltipStats.Count == 0
                        ? new List<List<string>>()
                        : orderedKeys.Select(key => BarTooltips.Lines(tooltipStats, key, seriesKey, tooltipAggregate)).ToList()
                }))
            .ToList();
    }
}
