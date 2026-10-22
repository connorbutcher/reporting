using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Re-ranks a chart's categories by a chosen column's aggregate instead of their natural order.</summary>
public static class CategorySorting
{
    /// <summary>Ceiling on the extra (category, value) scan run purely to rank categories.</summary>
    private const int MaxCategorySortScanRows = ScanCapping.MaxScanRows;

    /// <summary>
    /// Sorting by the bound measure reuses the values already in <paramref name="projected"/>; any other
    /// column pays for one extra scan. A stale column falls back to the natural order.
    /// </summary>
    public static async Task<List<string>> OrderedCategoryKeysAsync(
        IQueryable<DatasetRow> matching,
        ChartCategoryReader reader,
        int valueId,
        List<GroupedValueProjection> projected,
        List<string> naturalOrder,
        ChartSort sort,
        Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        if (sort.By != ChartSortBy.Column || sort.ColumnId is not { } sortColumnRef
            || columnsByRef.GetValueOrDefault(sortColumnRef) is not { } sortColumn)
        {
            return sort.Descending ? Enumerable.Reverse(naturalOrder).ToList() : naturalOrder;
        }

        var metrics = sortColumn.Id == valueId
            ? PooledMetrics(projected, sort.Aggregate)
            : await CategorySortMetricsAsync(matching, reader, sortColumn, sort.Aggregate);
        return OrderByMetric(naturalOrder, metrics, sort.Descending);
    }

    /// <summary>Reduces the already-pooled values for each category, when the sort column is the chart's own bound measure.</summary>
    private static Dictionary<string, IComparable> PooledMetrics(List<GroupedValueProjection> projected, SortAggregate aggregate)
    {
        return projected
            .GroupBy(p => p.Category)
            .ToDictionary(group => group.Key, group => ReduceForSort(group.Select(item => item.Value).ToList(), aggregate));
    }

    /// <summary>
    /// Scans (capped) each matching row's category and sort-column value and reduces per category. A
    /// category with no values is absent, so the caller sinks it to the end. Text reduces in memory (no
    /// SQL aggregate for "alphabetically first"); a date reduces as its epoch-ms number.
    /// </summary>
    public static async Task<Dictionary<string, IComparable>> CategorySortMetricsAsync(
        IQueryable<DatasetRow> matching, ChartCategoryReader reader, DatasetColumn sortColumn, SortAggregate aggregate)
    {
        var categoryId = reader.Column.Id;
        var sortColumnId = sortColumn.Id;
        var scanned = await CellPivot.Of(matching, categoryId, sortColumnId)
            .OrderBy(p => p.RowId)
            .Take(MaxCategorySortScanRows)
            .Select(p => new { p.T0, p.N0, p.D0, p.T1, p.N1, p.D1 })
            .ToListAsync();

        var keyed = scanned.Select(row => (
            Key: reader.Read(row.T0, row.N0, row.D0).Key,
            Value: new { StringValue = row.T1, NumberValue = row.N1, DateValue = row.D1 }));

        var metrics = new Dictionary<string, IComparable>();
        foreach (var group in keyed.GroupBy(row => row.Key))
        {
            if (sortColumn.Type == DatasetColumnType.String)
            {
                var texts = group
                    .Select(row => row.Value.StringValue)
                    .Where(text => !string.IsNullOrWhiteSpace(text))
                    .Select(text => text!.Trim())
                    .ToList();
                if (texts.Count > 0)
                {
                    metrics[group.Key] = ReduceTextForSort(texts, aggregate);
                }
                continue;
            }

            var values = sortColumn.Type == DatasetColumnType.DateTime
                ? group.Where(row => row.Value.DateValue is not null)
                    .Select(row => (row.Value.DateValue!.Value - DateTime.UnixEpoch).TotalMilliseconds).ToList()
                : group.Where(row => row.Value.NumberValue is not null)
                    .Select(row => row.Value.NumberValue!.Value).ToList();
            if (values.Count > 0)
            {
                metrics[group.Key] = ReduceForSort(values, aggregate);
            }
        }
        return metrics;
    }

    /// <summary>Reduces one category's pooled values to the single number a column sort ranks it by.</summary>
    private static IComparable ReduceForSort(List<double> values, SortAggregate aggregate)
    {
        if (values.Count == 0)
        {
            return 0d;
        }

        switch (aggregate)
        {
            case SortAggregate.Count: return (double)values.Count;
            case SortAggregate.Sum: return values.Sum();
            case SortAggregate.Average: return values.Average();
            case SortAggregate.Min: return values.Min();
            case SortAggregate.Max: return values.Max();
            case SortAggregate.Median:
                values.Sort();
                return Statistics.Quantile(values, 0.5);
            case SortAggregate.Spread:
                values.Sort();
                return Statistics.Quantile(values, 0.75) - Statistics.Quantile(values, 0.25);
            default: return 0d;
        }
    }

    /// <summary>Alphabetically first/last, or the row count. Aggregates meaningless for text fall back to first.</summary>
    private static IComparable ReduceTextForSort(List<string> values, SortAggregate aggregate)
    {
        return aggregate switch
        {
            SortAggregate.Count => (double)values.Count,
            SortAggregate.Max => values.Max(StringComparer.OrdinalIgnoreCase)!,
            _ => values.Min(StringComparer.OrdinalIgnoreCase)!
        };
    }

    /// <summary>
    /// <paramref name="naturalOrder"/> breaks ties, and a category without a metric sinks to the end
    /// regardless of direction.
    /// </summary>
    public static List<string> OrderByMetric(
        List<string> naturalOrder, IReadOnlyDictionary<string, IComparable> metrics, bool descending)
    {
        var indexed = naturalOrder.Select((category, position) => (category, position)).ToList();
        var withMetric = indexed.Where(entry => metrics.ContainsKey(entry.category));
        var without = indexed.Where(entry => !metrics.ContainsKey(entry.category));

        var ranked = descending
            ? withMetric.OrderByDescending(entry => metrics[entry.category]).ThenBy(entry => entry.position)
            : withMetric.OrderBy(entry => metrics[entry.category]).ThenBy(entry => entry.position);

        return ranked.Concat(without.OrderBy(entry => entry.position)).Select(entry => entry.category).ToList();
    }
}
