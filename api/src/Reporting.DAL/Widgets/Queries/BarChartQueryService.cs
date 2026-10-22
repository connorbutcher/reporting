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
/// category axis. The grouping runs as a single SQL GROUP BY on the category's typed
/// value, so only one row per distinct value/series comes back; those are then merged
/// in memory into date periods and, for a Top N sort, an "Other" category.
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
        var reader = new ChartCategoryReader(categoryColumn, dto.CategoryGrouping);

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

        // Every category seen, keyed by its typed key, and each measure's stats per (category, series).
        var categories = new Dictionary<string, ChartCategory>();
        var perMeasure = new List<(DatasetColumn? Column, Dictionary<(string Category, string Series), BarStats> Stats)>();
        foreach (var measure in measures)
        {
            var stats = await AggregateAsync(matching, reader, categories, measure is null, seriesId, measure?.Id ?? 0);
            perMeasure.Add((measure, stats));
        }

        var naturalOrder = reader.NaturalOrder(categories.Values).Select(c => c.Key).ToList();

        // A column sort re-ranks by a chosen column's aggregate (possibly a column that isn't even
        // plotted); an unresolvable column — a stale reference — falls back to the natural order
        // rather than blanking the chart. Either way `Descending` can still reverse the result.
        var sort = dto.Sort ?? new ChartSort();
        List<string> orderedKeys;
        if (sort.By == ChartSortBy.Column && sort.ColumnId is { } sortColumnRef
            && columnsByRef.GetValueOrDefault(sortColumnRef) is { } sortColumn)
        {
            var metrics = await CategorySorting.CategorySortMetricsAsync(matching, reader, sortColumn, sort.Aggregate);
            orderedKeys = CategorySorting.OrderByMetric(naturalOrder, metrics, sort.Descending);
        }
        else
        {
            orderedKeys = sort.Descending ? Enumerable.Reverse(naturalOrder).ToList() : naturalOrder;
        }

        // Tooltip columns reduce the same way as the bars, keyed by (category, series).
        var tooltipStats = new List<(ChartTooltipColumn Setting, DatasetColumn Column, Dictionary<(string Category, string Series), BarStats> Stats)>();
        foreach (var setting in dto.TooltipColumns)
        {
            var column = ResolveTooltipColumn(setting, columnsByRef, dataset.Columns);
            if (column?.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            {
                continue;
            }
            tooltipStats.Add((setting, column, await AggregateAsync(matching, reader, categories, false, seriesId, column.Id)));
        }

        // Top N keeps the first N in the chosen order; "Other" merges the rest into one category.
        if (sort.Limit is > 0 and var limit && orderedKeys.Count > limit)
        {
            var rest = orderedKeys.Skip(limit).ToHashSet();
            orderedKeys = orderedKeys.Take(limit).ToList();
            if (sort.ShowOther)
            {
                foreach (var (_, stats) in perMeasure)
                {
                    MergeIntoOther(stats, rest);
                }
                foreach (var (_, _, stats) in tooltipStats)
                {
                    MergeIntoOther(stats, rest);
                }
                categories[ChartCategory.OtherKey] = ChartCategory.Other;
                orderedKeys.Add(ChartCategory.OtherKey);
            }
        }

        var seriesKeys = perMeasure
            .SelectMany(m => m.Stats.Keys.Select(k => k.Series))
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // One series per (measure × split key), measure-major so a measure's split series sit together.
        var aggregate = dto.Aggregate;
        var tooltipAggregate = isCount ? Aggregate.Sum : aggregate;
        var series = perMeasure
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
                        : orderedKeys.Select(key => TooltipLines(tooltipStats, key, seriesKey, tooltipAggregate)).ToList()
                }))
            .ToList();

        return new BarChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Categories = orderedKeys.Select(key => reader.Label(categories[key])).ToList(),
            CategoryDetails = orderedKeys.Select(key => reader.Detail(categories[key])).ToList(),
            Series = series,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount
        };
    }

    /// <summary>
    /// Reduces one numeric column (or, for Count, every row) into stats per (category, series) — the
    /// needed cells pivoted in one pass (<see cref="CellPivot"/>), then a single SQL GROUP BY on the category's typed value, merged in memory into the reader's categories
    /// (so a date period collects every day in it). Every category met is recorded in
    /// <paramref name="categories"/>. Only rows carrying a number feed a non-count measure, so a
    /// category with none simply doesn't appear for it.
    /// </summary>
    internal static async Task<Dictionary<(string Category, string Series), BarStats>> AggregateAsync(
        IQueryable<DatasetRow> matching,
        ChartCategoryReader reader,
        Dictionary<string, ChartCategory> categories,
        bool countRows,
        int seriesId,
        int valueId)
    {
        var categoryId = reader.Column.Id;
        // Only a text column groups on its text; numbers and dates group on their typed value, so the
        // same value written two ways ("5" and "5.0") is one category.
        var textual = reader.Column.Type is not (DatasetColumnType.Int or DatasetColumnType.Double or DatasetColumnType.DateTime);

        var pivoted = CellPivot.Of(matching, categoryId, seriesId, valueId);
        if (!countRows)
        {
            pivoted = pivoted.Where(p => p.N2 != null);
        }

        var projected = pivoted.Select(p => new BarProjection
        {
            Text = textual ? (p.T0 ?? "").Trim() : "",
            Number = p.N0,
            Date = p.D0,
            Series = (p.T1 ?? "").Trim(),
            Value = p.N2
        });

        var groups = await projected
            .GroupBy(item => new { item.Text, item.Number, item.Date, item.Series })
            .Select(g => new BarGroup
            {
                Text = g.Key.Text,
                Number = g.Key.Number,
                Date = g.Key.Date,
                Series = g.Key.Series,
                Count = g.Count(),
                Sum = g.Sum(item => item.Value),
                Min = g.Min(item => item.Value),
                Max = g.Max(item => item.Value)
            })
            .ToListAsync();

        var stats = new Dictionary<(string, string), BarStats>();
        foreach (var group in groups)
        {
            var category = reader.Read(group.Text, group.Number, group.Date);
            categories.TryAdd(category.Key, category);
            var key = (category.Key, group.Series);
            var groupStats = BarStats.From(group);
            stats[key] = stats.TryGetValue(key, out var existing) ? existing.Merge(groupStats) : groupStats;
        }
        return stats;
    }

    /// <summary>Folds every category in <paramref name="rest"/> into the "Other" category, per series.</summary>
    private static void MergeIntoOther(Dictionary<(string Category, string Series), BarStats> stats, HashSet<string> rest)
    {
        foreach (var key in stats.Keys.Where(k => rest.Contains(k.Category)).ToList())
        {
            var otherKey = (ChartCategory.OtherKey, key.Series);
            stats[otherKey] = stats.TryGetValue(otherKey, out var other) ? other.Merge(stats[key]) : stats[key];
            stats.Remove(key);
        }
    }

    /// <summary>One bar's tooltip lines — each tooltip column's reduced value with its prefix/suffix, blanks skipped.</summary>
    internal static List<string> TooltipLines(
        List<(ChartTooltipColumn Setting, DatasetColumn Column, Dictionary<(string Category, string Series), BarStats> Stats)> tooltipStats,
        string category,
        string series,
        Aggregate aggregate)
    {
        var lines = new List<string>();
        foreach (var (setting, column, stats) in tooltipStats)
        {
            if (stats.TryGetValue((category, series), out var s) && s.Value(aggregate) is { } value)
            {
                var formatted = CellFormatter.Number(value, column.GetConfig() as NumericColumnConfig);
                lines.Add($"{setting.Prefix}{formatted}{setting.Suffix}");
            }
        }
        return lines;
    }

    /// <summary>A tooltip column by id, else — when it was picked from another dataset's schema — by its name here.</summary>
    internal static DatasetColumn? ResolveTooltipColumn(
        ChartTooltipColumn setting, Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> columns) =>
        columnsByRef.GetValueOrDefault(setting.ColumnId)
        ?? (string.IsNullOrWhiteSpace(setting.ColumnName)
            ? null
            : columns.FirstOrDefault(c => string.Equals(c.Name, setting.ColumnName, StringComparison.OrdinalIgnoreCase)));
}
