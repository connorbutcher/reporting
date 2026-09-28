using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>The 1-based position of some text within other text, ignoring case; 0 when absent.</summary>
public sealed class FindFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "FIND";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var find = Text(args, 0);
        var text = Text(args, 1);
        var start = WholeNumber(args, 2, 1);
        if (start < 1)
        {
            return null;
        }

        if (start - 1 > text.Length)
        {
            return 0.0;
        }

        return (double)(text.IndexOf(find, start - 1, StringComparison.OrdinalIgnoreCase) + 1);
    }
}
