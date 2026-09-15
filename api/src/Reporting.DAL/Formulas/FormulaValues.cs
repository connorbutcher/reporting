using System.Globalization;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Coerces a formula's boxed runtime value (double/bool/DateTime/string/null) into the CLR type an
/// operator or function needs, throwing <see cref="FormulaEvaluationException"/> — caught by the
/// caller and turned into a null cell for that one row — on a shape it can't honour.
/// </summary>
public static class FormulaValues
{
    public static double ToNumber(object? value) => value switch
    {
        double d => d,
        _ => throw new FormulaEvaluationException($"Expected a number but got {Describe(value)}."),
    };

    public static bool ToBool(object? value) => value switch
    {
        bool b => b,
        _ => throw new FormulaEvaluationException($"Expected true/false but got {Describe(value)}."),
    };

    public static DateTime ToDate(object? value) => value switch
    {
        DateTime d => d,
        _ => throw new FormulaEvaluationException($"Expected a date but got {Describe(value)}."),
    };

    /// <summary>Every value type formats to text — CONCAT and the like never fail on their own account.</summary>
    public static string ToText(object? value) => value switch
    {
        null => string.Empty,
        string s => s,
        double d => d.ToString(CultureInfo.InvariantCulture),
        bool b => b ? "True" : "False",
        DateTime dt => dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        _ => value.ToString() ?? string.Empty,
    };

    private static string Describe(object? value) => value is null ? "nothing" : $"'{value}'";
}
