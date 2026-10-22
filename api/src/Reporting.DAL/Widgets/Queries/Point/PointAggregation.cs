using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Every row sharing an X (a date bucketed by its grouping) reduced to one point per series: a SQL GROUP BY on
/// X's typed value, merged in memory into periods. Count needs no Y; other aggregates need a numeric Y.
/// </summary>
internal static class PointAggregation
{
    public static async Task<List<AggregatedPoint>> AggregateAsync(
        IQueryable<DatasetRow> matching, DatasetColumn xColumn, DatasetColumn? yColumn, DatasetColumn? seriesColumn,
        Aggregate aggregate, DateGrouping? grouping)
    {
        var groups = await GroupAsync(matching, xColumn, yColumn, seriesColumn, aggregate);
        var merged = Merge(groups, new ChartCategoryReader(xColumn, grouping));
        return merged
            .Where(entry => entry.Value.Stats.Value(aggregate) is not null)
            .Select(entry => ToPoint(entry.Key.Series, entry.Value.Category, entry.Value.Stats, aggregate))
            .ToList();
    }

    private static Task<List<BarGroup>> GroupAsync(
        IQueryable<DatasetRow> matching, DatasetColumn xColumn, DatasetColumn? yColumn, DatasetColumn? seriesColumn, Aggregate aggregate)
    {
        var xId = xColumn.Id;
        var yId = yColumn?.Id ?? 0;
        var seriesId = seriesColumn?.Id ?? 0;
        var textual = !PointAxes.IsNumeric(xColumn.Type);
        var pivoted = CellPivot.Of(PointAxes.RequireValue(matching, xId, xColumn.Type), xId, seriesId, yId);
        if (aggregate != Aggregate.Count)
        {
            pivoted = pivoted.Where(p => p.N2 != null);
        }

        return pivoted
            .Select(p => new BarProjection
            {
                Text = textual ? (p.T0 ?? "").Trim() : "",
                Number = p.N0,
                Date = p.D0,
                Series = (p.T1 ?? "").Trim(),
                Value = p.N2
            })
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
    }

    private static Dictionary<(string Key, string Series), (ChartCategory Category, BarStats Stats)> Merge(
        List<BarGroup> groups, ChartCategoryReader reader)
    {
        var merged = new Dictionary<(string Key, string Series), (ChartCategory Category, BarStats Stats)>();
        foreach (var group in groups)
        {
            var category = reader.Read(group.Text, group.Number, group.Date);
            if (category.IsBlank)
            {
                continue;
            }
            var key = (category.Key, group.Series);
            var stats = BarStats.From(group);
            merged[key] = merged.TryGetValue(key, out var existing) ? (category, existing.Stats.Merge(stats)) : (category, stats);
        }
        return merged;
    }

    private static AggregatedPoint ToPoint(string series, ChartCategory category, BarStats stats, Aggregate aggregate)
    {
        object x = category.Date is { } date ? (date - DateTime.UnixEpoch).TotalMilliseconds
            : category.Number is { } number ? number
            : category.Key;
        var rowCount = stats.Count == 1 ? "1 row" : $"{stats.Count:N0} rows";
        return new AggregatedPoint(series, new ChartPointDto
        {
            X = x,
            Y = stats.Value(aggregate)!.Value,
            TooltipLines = [rowCount]
        });
    }
}
