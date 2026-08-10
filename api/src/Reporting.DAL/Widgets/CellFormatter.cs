using System.Globalization;
using System.Text.Json;
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

    private static readonly JsonSerializerOptions ConfigOptions = new() { PropertyNameCaseInsensitive = true };

    public static string? Format(DatasetCell cell, DatasetColumnType type, JsonElement? configuration) => type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double =>
            cell.NumberValue is { } number ? FormatNumber(number, configuration) : null,
        DatasetColumnType.DateTime =>
            cell.DateValue is { } date ? FormatDate(date, configuration) : null,
        DatasetColumnType.Bool =>
            cell.BoolValue is { } flag ? FormatBool(flag, configuration) : null,
        _ => string.IsNullOrEmpty(cell.StringValue) ? null : cell.StringValue
    };

    private static string FormatNumber(double value, JsonElement? configuration)
    {
        var config = Deserialize<NumericConfig>(configuration) ?? new NumericConfig();
        var grouping = config.UseGrouping != false;

        // A fixed decimal count formats to exactly that many places; otherwise up
        // to 3, trimmed of trailing zeros — matching Intl.NumberFormat's defaults.
        var formatted = config.Decimals is { } decimals && decimals >= 0
            ? value.ToString((grouping ? "N" : "F") + decimals, CultureInfo.InvariantCulture)
            : value.ToString(grouping ? "#,##0.###" : "0.###", CultureInfo.InvariantCulture);

        return $"{config.Prefix}{formatted}{config.Suffix}";
    }

    private static string FormatDate(DateTime value, JsonElement? configuration)
    {
        var pattern = Deserialize<DateConfig>(configuration)?.DateFormat;
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

    private static string FormatBool(bool value, JsonElement? configuration)
    {
        var config = Deserialize<BoolConfig>(configuration);
        return value ? (config?.TrueLabel ?? "Yes") : (config?.FalseLabel ?? "No");
    }

    private static T? Deserialize<T>(JsonElement? configuration) where T : class
    {
        if (configuration is not { ValueKind: JsonValueKind.Object } element) return null;
        return JsonSerializer.Deserialize<T>(element.GetRawText(), ConfigOptions);
    }

    private sealed class NumericConfig
    {
        public int? Decimals { get; set; }
        public bool? UseGrouping { get; set; }
        public string Prefix { get; set; } = string.Empty;
        public string Suffix { get; set; } = string.Empty;
    }

    private sealed class DateConfig
    {
        public string? DateFormat { get; set; }
    }

    private sealed class BoolConfig
    {
        public string? TrueLabel { get; set; }
        public string? FalseLabel { get; set; }
    }
}
