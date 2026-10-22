using System.Globalization;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A cell's typed value as a display string, per its column's formatting configuration.</summary>
public static class CellFormatter
{
    private const string DefaultDateFormat = "dd/MM/yyyy";

    public static string? Format(DatasetCell cell, DatasetColumnType type, DatasetColumnConfig? configuration)
    {
        return type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double =>
                cell.NumberValue is { } number ? FormatNumber(number, configuration as NumericColumnConfig) : null,
            DatasetColumnType.DateTime =>
                cell.DateValue is { } date ? FormatDate(date, configuration as DateColumnConfig) : null,
            DatasetColumnType.Bool =>
                cell.BoolValue is { } flag ? FormatBool(flag, configuration as BoolColumnConfig) : null,
            _ => string.IsNullOrEmpty(cell.StringValue) ? null : cell.StringValue
        };
    }

    /// <summary>For values that never existed as a cell, such as a pivot's aggregates. Null config uses the defaults.</summary>
    public static string Number(double value, NumericColumnConfig? config)
    {
        return FormatNumber(value, config);
    }

    /// <summary>For values that never existed as a cell, such as a chart's grouping key.</summary>
    public static string Date(DateTime value, DateColumnConfig? config)
    {
        return FormatDate(value, config);
    }

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
        if (string.IsNullOrEmpty(pattern))
        {
            pattern = DefaultDateFormat;
        }

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

    private static string FormatBool(bool value, BoolColumnConfig? config)
    {
        return value ? (config?.TrueLabel ?? "Yes") : (config?.FalseLabel ?? "No");
    }
}
