using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Characters from the middle of the text, from a 1-based position.</summary>
public sealed class MidFunction : IFormulaFunctionImplementation
{
    public string Key => "MID";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var start = WholeNumber(args, 1, 1);
        var length = WholeNumber(args, 2, 0);
        if (start < 1 || length < 0) return null;
        if (start > text.Length) return string.Empty;

        return text.Substring(start - 1, Math.Min(length, text.Length - start + 1));
    }
}
