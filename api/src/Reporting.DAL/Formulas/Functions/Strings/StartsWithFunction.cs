using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Whether the text begins with other text, ignoring case.</summary>
public sealed class StartsWithFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "STARTSWITH";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Text(args, 0).StartsWith(Text(args, 1), StringComparison.OrdinalIgnoreCase);
    }
}
