using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>The text after the nth occurrence of a delimiter; blank when there isn't one.</summary>
public sealed class TextAfterFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "TEXTAFTER";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var delimiter = Text(args, 1);
        var index = Delimiters.IndexOf(text, delimiter, WholeNumber(args, 2, 1));
        if (index < 0)
        {
            return null;
        }

        return text[(index + delimiter.Length)..];
    }
}
