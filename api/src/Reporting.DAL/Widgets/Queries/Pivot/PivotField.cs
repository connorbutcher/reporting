using System.Globalization;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A row or column field's reading of one cell: what it shows, how it sorts, and the period it falls in when grouped.</summary>
public readonly record struct PivotFieldValue(string Display, object? SortKey, DateTime? PeriodStart, DateTime? PeriodEnd);

/// <summary>
/// A row or column field of the pivot: the column it reads and, for a date column, the period it
/// groups by. Grouped, every date in the same period reads as one value keyed by the period's start.
/// </summary>
public sealed class PivotField(DatasetColumn column, DateGrouping? grouping)
{
    public DatasetColumn Column { get; } = column;

    /// <summary>The period, applied only to a date column.</summary>
    public DateGrouping? Grouping { get; } = column.Type == DatasetColumnType.DateTime ? grouping : null;

    public PivotFieldValue Read(DatasetCell? cell)
    {
        if (Grouping is { } grouping)
        {
            if (cell?.DateValue is not { } date)
            {
                return new PivotFieldValue("(blank)", null, null, null);
            }
            var (start, end, display) = Period(date, grouping);
            return new PivotFieldValue(display, start.Ticks, start, end);
        }

        var formatted = cell is null ? null : CellFormatter.Format(cell, Column.Type, Column.GetConfig());
        return new PivotFieldValue(string.IsNullOrEmpty(formatted) ? "(blank)" : formatted, SortKey(cell), null, null);
    }

    /// <summary>A cell's typed ordering key: a number (date as ticks) for numeric/date columns, else the string.</summary>
    private object? SortKey(DatasetCell? cell) => Column.Type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double => cell?.NumberValue,
        DatasetColumnType.DateTime => cell?.DateValue?.Ticks,
        DatasetColumnType.Bool => cell?.BoolValue,
        _ => cell?.StringValue?.Trim(),
    };

    /// <summary>The period a date falls in: its first instant, the first instant after it, and its label.</summary>
    public static (DateTime Start, DateTime End, string Display) Period(DateTime date, DateGrouping grouping)
    {
        var culture = CultureInfo.InvariantCulture;
        var day = date.Date;
        switch (grouping)
        {
            case DateGrouping.Day:
                return (day, day.AddDays(1), day.ToString("d MMM yyyy", culture));
            case DateGrouping.Week:
                // ISO weeks start on Monday and belong to the year holding their Thursday.
                var monday = day.AddDays(-(((int)day.DayOfWeek + 6) % 7));
                return (monday, monday.AddDays(7), $"{ISOWeek.GetYear(day)}-W{ISOWeek.GetWeekOfYear(day):00}");
            case DateGrouping.Quarter:
                var quarter = (day.Month - 1) / 3;
                var quarterStart = new DateTime(day.Year, quarter * 3 + 1, 1);
                return (quarterStart, quarterStart.AddMonths(3), $"{day.Year} Q{quarter + 1}");
            case DateGrouping.Year:
                var yearStart = new DateTime(day.Year, 1, 1);
                return (yearStart, yearStart.AddYears(1), day.Year.ToString(culture));
            default:
                var monthStart = new DateTime(day.Year, day.Month, 1);
                return (monthStart, monthStart.AddMonths(1), monthStart.ToString("MMM yyyy", culture));
        }
    }
}
