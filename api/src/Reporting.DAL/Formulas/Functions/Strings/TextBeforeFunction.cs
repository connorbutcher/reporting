using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>The text before the nth occurrence of a delimiter; blank when there isn't one.</summary>
public sealed class TextBeforeFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "TEXTBEFORE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var index = Delimiters.IndexOf(text, Text(args, 1), WholeNumber(args, 2, 1));
        if (index < 0)
        {
            return null;
        }

        return text[..index];
    }
}
