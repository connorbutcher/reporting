using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Orders pivot groups by their dimension sort keys, position by position, using each dimension's
/// column type — numerically/chronologically for numeric and date columns (blanks last),
/// alphabetically otherwise — so the nested rows read in a natural order.
/// </summary>
public sealed class PivotGroupComparer(IReadOnlyList<DatasetColumnType> types) : IComparer<PivotGroup>
{
    public int Compare(PivotGroup? left, PivotGroup? right)
    {
        if (left is null || right is null)
        {
            return 0;
        }

        for (var i = 0; i < types.Count; i++)
        {
            var order = CompareKey(left.SortKeys[i], right.SortKeys[i], types[i]);
            if (order != 0)
            {
                return order;
            }
        }
        return 0;
    }

    private static int CompareKey(object? left, object? right, DatasetColumnType type)
    {
        // A missing key sinks to the end, so blank dimensions trail their populated siblings.
        if (left is null)
        {
            return right is null ? 0 : 1;
        }
        if (right is null)
        {
            return -1;
        }

        return type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => ((double)left).CompareTo((double)right),
            DatasetColumnType.DateTime => ((long)left).CompareTo((long)right),
            DatasetColumnType.Bool => ((bool)left).CompareTo((bool)right),
            _ => string.Compare((string)left, (string)right, StringComparison.OrdinalIgnoreCase),
        };
    }
}
