using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Whether the text contains other text, ignoring case.</summary>
public sealed class ContainsFunction : IFormulaFunctionImplementation
{
    public string Key => "CONTAINS";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Text(args, 0).Contains(Text(args, 1), StringComparison.OrdinalIgnoreCase);
}
