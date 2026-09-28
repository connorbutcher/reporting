using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.DAL.Formulas.Evaluation;

/// <summary>Turns formula values into text: what a formula sees when it needs text, and what a cell of a given column type stores.</summary>
public static class FormulaValueText
{
    /// <summary>A value as the text a formula sees when it needs one (CONCAT, &amp;, TEXT). Blank is empty text.</summary>
    public static string ToText(object? value)
    {
        switch (value)
        {
            case null:
                return string.Empty;
            case string text:
                return text;
            case double number:
                return NumberText(number);
            case bool flag:
                return flag ? "TRUE" : "FALSE";
            case DateTime date:
                return DateText(date);
            default:
                return value.ToString() ?? string.Empty;
        }
    }

    public static string NumberText(double value)
    {
        return value.ToString("R", CultureInfo.InvariantCulture);
    }

    public static string DateText(DateTime value)
    {
        return value.TimeOfDay == TimeSpan.Zero
            ? value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : value.ToString("yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// A computed value as the raw text a cell of this column type stores (which <c>CellValues.Apply</c> then
    /// parses into the typed fields). Null when the value is blank or doesn't suit the column type.
    /// </summary>
    public static string? ToCellText(object? value, DatasetColumnType type)
    {
        if (value is null)
        {
            return null;
        }

        switch (type)
        {
            case DatasetColumnType.String:
                return ToText(value);
            case DatasetColumnType.Int when value is double whole:
                return NumberText(Math.Round(whole, MidpointRounding.AwayFromZero));
            case DatasetColumnType.Double when value is double number:
                return NumberText(number);
            case DatasetColumnType.Bool when value is bool flag:
                return flag ? "True" : "False";
            case DatasetColumnType.DateTime when value is DateTime date:
                return DateText(date);
            default:
                return null;
        }
    }

    /// <summary>A value described the way an error message would name it: "a number", "text", "a blank".</summary>
    public static string Describe(object? value)
    {
        switch (value)
        {
            case null:
                return "a blank";
            case double:
                return "a number";
            case string:
                return "text";
            case bool:
                return "a true/false value";
            case DateTime:
                return "a date";
            default:
                return "a value";
        }
    }

    /// <summary>A parameter kind described the way an error message would name it.</summary>
    public static string Describe(FormulaValueKind kind)
    {
        switch (kind)
        {
            case FormulaValueKind.Number:
                return "a number";
            case FormulaValueKind.Text:
                return "text";
            case FormulaValueKind.Bool:
                return "a true/false value";
            case FormulaValueKind.Date:
                return "a date";
            default:
                return "a value";
        }
    }
}
