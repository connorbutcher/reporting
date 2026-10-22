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
        var rowsQuery = countRows
            ? matching
            : matching.Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null));
        var groups = await GroupAsync(rowsQuery, reader.Column, seriesId, valueId);

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

    /// <summary>Only a text column groups on its text, so "5" and "5.0" in a number column are one category.</summary>
    private static Task<List<BarGroup>> GroupAsync(IQueryable<DatasetRow> rows, DatasetColumn categoryColumn, int seriesId, int valueId)
    {
        var categoryId = categoryColumn.Id;
        var textual = categoryColumn.Type is not (DatasetColumnType.Int or DatasetColumnType.Double or DatasetColumnType.DateTime);

        return rows
            .Select(r => new BarProjection
            {
                Text = textual ? (r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.StringValue).FirstOrDefault() ?? "").Trim() : "",
                Number = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.NumberValue).FirstOrDefault(),
                Date = r.Cells.Where(c => c.ColumnId == categoryId).Select(c => c.DateValue).FirstOrDefault(),
                Series = (r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault() ?? "").Trim(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
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
