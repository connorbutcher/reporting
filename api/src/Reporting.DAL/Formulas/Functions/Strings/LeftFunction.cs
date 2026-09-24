using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>The first characters of the text.</summary>
public sealed class LeftFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "LEFT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var count = WholeNumber(args, 1, 0);
        if (count < 0)
        {
            return null;
        }

        return text[..Math.Min(count, text.Length)];
    }
}
