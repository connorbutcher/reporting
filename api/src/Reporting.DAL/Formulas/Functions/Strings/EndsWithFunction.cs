using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Whether the text ends with other text, ignoring case.</summary>
public sealed class EndsWithFunction : IFormulaFunctionImplementation
{
    public string Key => "ENDSWITH";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Text(args, 0).EndsWith(Text(args, 1), StringComparison.OrdinalIgnoreCase);
}
