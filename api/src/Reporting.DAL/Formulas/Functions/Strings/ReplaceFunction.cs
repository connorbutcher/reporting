using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Replaces every (case-sensitive) occurrence of some text with other text.</summary>
public sealed class ReplaceFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "REPLACE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var find = Text(args, 1);
        if (find.Length == 0)
        {
            return text;
        }

        return text.Replace(find, Text(args, 2), StringComparison.Ordinal);
    }
}
