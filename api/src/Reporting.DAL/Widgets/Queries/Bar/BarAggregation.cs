using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class BarAggregation
{
    /// <summary>
    /// One numeric column (or, for Count, every row) reduced per (category, series): a SQL GROUP BY on the
    /// category's typed value, merged in memory into the reader's categories, each recorded in
    /// <paramref name="categories"/>. Only rows with a number feed a non-count measure.
    /// </summary>
    public static async Task<Dictionary<(string Category, string Series), BarStats>> AggregateAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, Dictionary<string, ChartCategory> categories,
        bool countRows, int seriesId, int valueId)
    {
        var groups = await GroupAsync(matching, reader.Column, countRows, seriesId, valueId);

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

    /// <summary>Folds every category in <paramref name="rest"/> into "Other", per series.</summary>
    public static void MergeIntoOther(Dictionary<(string Category, string Series), BarStats> stats, HashSet<string> rest)
    {
        foreach (var key in stats.Keys.Where(k => rest.Contains(k.Category)).ToList())
        {
            var otherKey = (ChartCategory.OtherKey, key.Series);
            stats[otherKey] = stats.TryGetValue(otherKey, out var other) ? other.Merge(stats[key]) : stats[key];
            stats.Remove(key);
        }
    }

    /// <summary>
    /// The needed cells pivoted in one pass (<see cref="CellPivot"/>), then grouped in SQL. Only a text column
    /// groups on its text, so "5" and "5.0" in a number column are one category.
    /// </summary>
    private static Task<List<BarGroup>> GroupAsync(
        IQueryable<DatasetRow> matching, DatasetColumn categoryColumn, bool countRows, int seriesId, int valueId)
    {
        var textual = categoryColumn.Type is not (DatasetColumnType.Int or DatasetColumnType.Double or DatasetColumnType.DateTime);
        var pivoted = CellPivot.Of(matching, categoryColumn.Id, seriesId, valueId);
        if (!countRows)
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
}
