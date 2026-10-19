using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Orders pivot dimension keys by the field's type — numerically/chronologically for numeric and date
/// fields (a grouped date's key is its period start), alphabetically otherwise — with blanks last.
/// </summary>
public static class PivotKeyComparison
{
    public static int Compare(object? left, object? right, DatasetColumnType type)
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

    /// <summary>Compares two key tuples position by position.</summary>
    public static int Compare(IReadOnlyList<object?> left, IReadOnlyList<object?> right, IReadOnlyList<DatasetColumnType> types)
    {
        for (var i = 0; i < types.Count; i++)
        {
            var order = Compare(left[i], right[i], types[i]);
            if (order != 0)
            {
                return order;
            }
        }
        return 0;
    }
}
