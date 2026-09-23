using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Runtime values in a formula are plain CLR objects: <c>null</c> (blank), <c>double</c>, <c>string</c>, <c>bool</c>
/// and <c>DateTime</c>. This is the one place that maps them to and from kinds, text and stored cell text.
/// </summary>
public static class FormulaValues
{
    public static FormulaValueKind? KindOf(object? value) => value switch
    {
        null => null,
        double => FormulaValueKind.Number,
        string => FormulaValueKind.Text,
        bool => FormulaValueKind.Bool,
        DateTime => FormulaValueKind.Date,
        _ => throw new FormulaEvaluationException($"Unsupported value type {value.GetType().Name}.")
    };

    /// <summary>The kind of value a column of this type holds.</summary>
    public static FormulaValueKind KindOf(DatasetColumnType type) => type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double => FormulaValueKind.Number,
        DatasetColumnType.Bool => FormulaValueKind.Bool,
        DatasetColumnType.DateTime => FormulaValueKind.Date,
        _ => FormulaValueKind.Text
    };

    /// <summary>The column type a formula of this kind naturally produces; null when the kind can't be told (Any).</summary>
    public static DatasetColumnType? NaturalColumnType(FormulaValueKind kind) => kind switch
    {
        FormulaValueKind.Number => DatasetColumnType.Double,
        FormulaValueKind.Text => DatasetColumnType.String,
        FormulaValueKind.Bool => DatasetColumnType.Bool,
        FormulaValueKind.Date => DatasetColumnType.DateTime,
        _ => null
    };

    /// <summary>Whether a formula of <paramref name="kind"/> can fill a column of <paramref name="type"/>. A text column takes anything (as its canonical text); an unknown kind is accepted and checked per value.</summary>
    public static bool FitsColumn(FormulaValueKind kind, DatasetColumnType type) =>
        kind == FormulaValueKind.Any || type == DatasetColumnType.String || KindOf(type) == kind;

    public static bool Matches(object? value, FormulaValueKind kind) =>
        value is null || kind == FormulaValueKind.Any || KindOf(value) == kind;

    /// <summary>A value as the text a formula sees when it needs one (CONCAT, &amp;, TEXT). Blank is empty text.</summary>
    public static string ToText(object? value) => value switch
    {
        null => string.Empty,
        string s => s,
        double d => NumberText(d),
        bool b => b ? "TRUE" : "FALSE",
        DateTime dt => DateText(dt),
        _ => value.ToString() ?? string.Empty
    };

    public static string NumberText(double value) => value.ToString("R", CultureInfo.InvariantCulture);

    public static string DateText(DateTime value) =>
        value.TimeOfDay == TimeSpan.Zero
            ? value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : value.ToString("yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture);

    /// <summary>
    /// A computed value as the raw text a cell of this column type stores (which <c>CellValues.Apply</c> then
    /// parses into the typed fields). Null when the value is blank or doesn't suit the column type.
    /// </summary>
    public static string? ToCellText(object? value, DatasetColumnType type)
    {
        if (value is null) return null;

        switch (type)
        {
            case DatasetColumnType.String:
                return ToText(value);
            case DatasetColumnType.Int when value is double i:
                return NumberText(Math.Round(i, MidpointRounding.AwayFromZero));
            case DatasetColumnType.Double when value is double d:
                return NumberText(d);
            case DatasetColumnType.Bool when value is bool b:
                return b ? "True" : "False";
            case DatasetColumnType.DateTime when value is DateTime dt:
                return DateText(dt);
            default:
                return null;
        }
    }

    /// <summary>Equality across the value kinds. Text ignores case; values of different kinds are never equal.</summary>
    public static bool AreEqual(object left, object right) => (left, right) switch
    {
        (string a, string b) => string.Equals(a, b, StringComparison.OrdinalIgnoreCase),
        (double a, double b) => a == b,
        (bool a, bool b) => a == b,
        (DateTime a, DateTime b) => a == b,
        _ => false
    };

    /// <summary>Ordering across the value kinds; both sides must be the same kind (and not bool).</summary>
    public static int Compare(object left, object right) => (left, right) switch
    {
        (string a, string b) => string.Compare(a, b, StringComparison.OrdinalIgnoreCase),
        (double a, double b) => a.CompareTo(b),
        (DateTime a, DateTime b) => a.CompareTo(b),
        _ => throw new FormulaEvaluationException($"Can't compare {Describe(left)} with {Describe(right)}.")
    };

    public static string Describe(object? value) => value switch
    {
        null => "a blank",
        double => "a number",
        string => "text",
        bool => "a true/false value",
        DateTime => "a date",
        _ => "a value"
    };

    /// <summary>NaN and infinities (from things like a huge POWER) become blank rather than poisoning a cell.</summary>
    public static object? Normalize(object? value) =>
        value is double d && !double.IsFinite(d) ? null : value;
}
