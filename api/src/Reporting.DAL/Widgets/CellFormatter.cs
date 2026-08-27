using System.Globalization;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Turns a cell's already-typed value into the same display string the client used
/// to build from a raw string plus the column's stored formatting configuration —
/// ported field-for-field from the table widget's old client-side `format()`.
/// </summary>
public static class CellFormatter
{
    private const string DefaultDateFormat = "dd/MM/yyyy";

    public static string? Format(DatasetCell cell, DatasetColumnType type, DatasetColumnConfig? configuration) => type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double =>
            cell.NumberValue is { } number ? FormatNumber(number, configuration as NumericColumnConfig) : null,
        DatasetColumnType.DateTime =>
            cell.DateValue is { } date ? FormatDate(date, configuration as DateColumnConfig) : null,
        DatasetColumnType.Bool =>
            cell.BoolValue is { } flag ? FormatBool(flag, configuration as BoolColumnConfig) : null,
        _ => string.IsNullOrEmpty(cell.StringValue) ? null : cell.StringValue
    };

    private static string FormatNumber(double value, NumericColumnConfig? config)
    {
        config ??= new NumericColumnConfig();
        var grouping = config.UseGrouping != false;

        // A fixed decimal count formats to exactly that many places; otherwise up
        // to 3, trimmed of trailing zeros — matching Intl.NumberFormat's defaults.
        var formatted = config.Decimals is { } decimals && decimals >= 0
            ? value.ToString((grouping ? "N" : "F") + decimals, CultureInfo.InvariantCulture)
            : value.ToString(grouping ? "#,##0.###" : "0.###", CultureInfo.InvariantCulture);

        return $"{config.Prefix}{formatted}{config.Suffix}";
    }

    private static string FormatDate(DateTime value, DateColumnConfig? config)
    {
        var pattern = config?.DateFormat;
        if (string.IsNullOrEmpty(pattern)) pattern = DefaultDateFormat;

        try
        {
            return value.ToString(pattern, CultureInfo.InvariantCulture);
        }
        catch (FormatException)
        {
            // A bad pattern shouldn't blank the cell.
            return value.ToString(DefaultDateFormat, CultureInfo.InvariantCulture);
        }
    }

    private static string FormatBool(bool value, BoolColumnConfig? config) =>
        value ? (config?.TrueLabel ?? "Yes") : (config?.FalseLabel ?? "No");
}
