using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// An axis value is the trimmed string for a text column, epoch milliseconds for a date column (plotted on
/// an echarts time axis), and the number otherwise.
/// </summary>
internal static class PointAxes
{
    public static bool IsNumeric(DatasetColumnType? type)
    {
        return type is DatasetColumnType.Int or DatasetColumnType.Double or DatasetColumnType.DateTime;
    }

    /// <summary>Rows carrying a value of the axis's kind, kept as an expression EF can translate.</summary>
    public static IQueryable<DatasetRow> RequireValue(IQueryable<DatasetRow> rows, int columnId, DatasetColumnType? type)
    {
        return type switch
        {
            DatasetColumnType.String => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.StringValue != null)),
            DatasetColumnType.DateTime => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.DateValue != null)),
            _ => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.NumberValue != null))
        };
    }

    public static object Value(DatasetCell cell, DatasetColumnType? type)
    {
        return type switch
        {
            DatasetColumnType.String => cell.StringValue!.Trim(),
            DatasetColumnType.DateTime => (cell.DateValue!.Value - DateTime.UnixEpoch).TotalMilliseconds,
            _ => cell.NumberValue!.Value
        };
    }

    /// <summary>Typed like an axis value but tolerating a missing cell, which reads as null.</summary>
    public static IComparable? SortValue(DatasetCell? cell, DatasetColumnType? type)
    {
        if (cell is null)
        {
            return null;
        }

        return type switch
        {
            DatasetColumnType.String => cell.StringValue?.Trim(),
            DatasetColumnType.DateTime => cell.DateValue is { } date ? date : null,
            DatasetColumnType.Bool => cell.BoolValue is { } flag ? flag : null,
            _ => cell.NumberValue is { } number ? number : null
        };
    }

    /// <summary>Points with no sort value sink to the end regardless of direction.</summary>
    public static List<ChartPointDto> Order(List<(ChartPointDto Point, IComparable? SortKey)> points, bool descending)
    {
        var ordered = points.OrderBy(entry => entry.SortKey is null ? 1 : 0);
        return (descending
                ? ordered.ThenByDescending(entry => entry.SortKey)
                : ordered.ThenBy(entry => entry.SortKey))
            .Select(entry => entry.Point)
            .ToList();
    }
}
