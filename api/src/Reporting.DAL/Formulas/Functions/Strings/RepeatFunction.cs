using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Repeats the text a number of times, up to a size limit.</summary>
public sealed class RepeatFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "REPEAT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var count = WholeNumber(args, 1, 0);
        if (count < 0 || (long)text.Length * count > TextLimits.MaxLength)
        {
            return null;
        }

        return string.Concat(Enumerable.Repeat(text, count));
    }
}
