using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>The last characters of the text.</summary>
public sealed class RightFunction : IFormulaFunctionImplementation
{
    public string Key => "RIGHT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var count = WholeNumber(args, 1, 0);
        return count < 0 ? null : text[Math.Max(0, text.Length - count)..];
    }
}
