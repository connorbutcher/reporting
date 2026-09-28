using Reporting.Abstractions;

namespace Reporting.DAL.Formulas.Evaluation;

/// <summary>
/// Runtime values in a formula are plain CLR objects: <c>null</c> (blank), <c>double</c>, <c>string</c>, <c>bool</c>
/// and <c>DateTime</c>. This maps them, and dataset column types, to the kinds the formula language talks in.
/// </summary>
public static class FormulaValueKinds
{
    public static FormulaValueKind? KindOf(object? value)
    {
        switch (value)
        {
            case null:
                return null;
            case double:
                return FormulaValueKind.Number;
            case string:
                return FormulaValueKind.Text;
            case bool:
                return FormulaValueKind.Bool;
            case DateTime:
                return FormulaValueKind.Date;
            default:
                throw new FormulaEvaluationException($"Unsupported value type {value.GetType().Name}.");
        }
    }

    /// <summary>The kind of value a column of this type holds.</summary>
    public static FormulaValueKind KindOf(DatasetColumnType type)
    {
        switch (type)
        {
            case DatasetColumnType.Int:
            case DatasetColumnType.Double:
                return FormulaValueKind.Number;
            case DatasetColumnType.Bool:
                return FormulaValueKind.Bool;
            case DatasetColumnType.DateTime:
                return FormulaValueKind.Date;
            default:
                return FormulaValueKind.Text;
        }
    }

    /// <summary>The column type a formula of this kind naturally produces; null when the kind can't be told (Any).</summary>
    public static DatasetColumnType? NaturalColumnType(FormulaValueKind kind)
    {
        switch (kind)
        {
            case FormulaValueKind.Number:
                return DatasetColumnType.Double;
            case FormulaValueKind.Text:
                return DatasetColumnType.String;
            case FormulaValueKind.Bool:
                return DatasetColumnType.Bool;
            case FormulaValueKind.Date:
                return DatasetColumnType.DateTime;
            default:
                return null;
        }
    }

    /// <summary>Whether a formula of <paramref name="kind"/> can fill a column of <paramref name="type"/>. A text column takes anything (as its canonical text); an unknown kind is accepted and checked per value.</summary>
    public static bool FitsColumn(FormulaValueKind kind, DatasetColumnType type)
    {
        return kind == FormulaValueKind.Any || type == DatasetColumnType.String || KindOf(type) == kind;
    }

    /// <summary>Whether a value suits a parameter kind. A blank suits any kind: it is dealt with by the function's own blank handling.</summary>
    public static bool Matches(object? value, FormulaValueKind kind)
    {
        return value is null || kind == FormulaValueKind.Any || KindOf(value) == kind;
    }
}
