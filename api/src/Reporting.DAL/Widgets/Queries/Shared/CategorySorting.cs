using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Re-ranks a chart's categories by a column other than the one it already pools for its own
/// purpose — shared by bar, box-plot and Xbar-R, whose categories are otherwise ordered by the
/// category column's own natural order.
/// </summary>
public static class CategorySorting
{
    /// <summary>
    /// Ceiling on rows scanned when a chart sorts its categories by a column other than the one
    /// it already pools for its own purpose — a separate, lightweight (category, value) scan run
    /// purely to rank the categories.
    /// </summary>
    private const int MaxCategorySortScanRows = ScanCapping.MaxScanRows;

    /// <summary>
    /// A column sort re-ranks <paramref name="naturalOrder"/> by a chosen column's aggregate —
    /// shared by box-plot and Xbar-R. Sorting by the already-bound measure column reuses the
    /// values <paramref name="projected"/> already pooled in memory rather than scanning the
    /// dataset again; any other column pays for one extra, purpose-built scan. An unresolvable
    /// column — a stale reference — falls back to the natural order, same as bar's own column sort.
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
    private static Dictionary<string, IComparable> PooledMetrics(List<GroupedValueProjection> projected, SortAggregate aggregate) =>
        projected
            .GroupBy(p => p.Category)
            .ToDictionary(group => group.Key, group => ReduceForSort(group.Select(item => item.Value).ToList(), aggregate));

    /// <summary>
    /// Per-category metric for a column sort that isn't already pooled in memory for some other
    /// reason — a bar chart's SQL-only aggregation, or a box plot/Xbar-R sorting by a column other
    /// than its bound measure. Scans (capped) the matching rows' category and sort-column values and
    /// reduces each category's values by the chosen aggregate; categories are keyed by
    /// <paramref name="reader"/>, exactly as the chart keys them. A category with no values for the
    /// sort column is simply absent from the result, so the caller can sink it to the end. A text
    /// sort column ranks alphabetically (Min/Max) or by row count — reduced in C# since there's no
    /// SQL aggregate for "alphabetically first"; a date column reduces as its epoch-ms number.
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

    /// <summary>
    /// Reduces one category's pooled text values to the single value a text column sort ranks it
    /// by: alphabetically first/last, or how many rows had one. Sum/Average/Median/Spread have no
    /// meaning for text and fall back to the alphabetically-first value.
    /// </summary>
    private static IComparable ReduceTextForSort(List<string> values, SortAggregate aggregate) => aggregate switch
    {
        SortAggregate.Count => (double)values.Count,
        SortAggregate.Max => values.Max(StringComparer.OrdinalIgnoreCase)!,
        _ => values.Min(StringComparer.OrdinalIgnoreCase)!
    };

    /// <summary>
    /// Re-orders a category list by a per-category metric, keeping <paramref name="naturalOrder"/>
    /// (the category column's own order) as the stable tiebreak and as the fallback position for
    /// any category the metric has no value for — sunk to the end regardless of direction.
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
