using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>Parses raw cell text. Filter operands use the same helpers so they can't disagree with stored data.</summary>
public static class CellValues
{
    public static bool TryParseNumber(string? raw, out double value) =>
        double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out value);

    public static bool TryParseBool(string? raw, out bool value)
    {
        if (bool.TryParse(raw, out value))
        {
            return true;
        }

        // Also accept the 1/0 and yes/no forms an import is likely to produce.
        switch (raw?.Trim().ToLowerInvariant())
        {
            case "1" or "yes" or "y":
                value = true;
                return true;
            case "0" or "no" or "n":
                value = false;
                return true;
            default:
                return false;
        }
    }

    public static bool TryParseDate(string? raw, out DateTime value) =>
        DateTime.TryParse(
            raw,
            CultureInfo.InvariantCulture,
            DateTimeStyles.RoundtripKind | DateTimeStyles.AllowWhiteSpaces,
            out value);

    public static void Apply(DatasetCell cell, string? raw, DatasetColumnType type)
    {
        cell.StringValue = raw;
        cell.NumberValue = null;
        cell.BoolValue = null;
        cell.DateValue = null;

        // Blank stays untyped; that's what "is empty" tests.
        if (string.IsNullOrWhiteSpace(raw))
        {
            return;
        }

        switch (type)
        {
            case DatasetColumnType.Int or DatasetColumnType.Double:
                if (TryParseNumber(raw, out var number))
                {
                    cell.NumberValue = number;
                }

                break;
            case DatasetColumnType.Bool:
                if (TryParseBool(raw, out var flag))
                {
                    cell.BoolValue = flag;
                }

                break;
            case DatasetColumnType.DateTime:
                if (TryParseDate(raw, out var date))
                {
                    cell.DateValue = date;
                }

                break;
        }
    }

    /// <summary>The caller adds it to its row, which sets the row FK.</summary>
    public static DatasetCell Create(int columnId, string? raw, DatasetColumnType type)
    {
        var cell = new DatasetCell { ColumnId = columnId };
        Apply(cell, raw, type);
        return cell;
    }
}
