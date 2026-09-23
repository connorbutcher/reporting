using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Replaces every (case-sensitive) occurrence of some text with other text.</summary>
public sealed class ReplaceFunction : IFormulaFunctionImplementation
{
    public string Key => "REPLACE";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Text(args, 1).Length == 0 ? Text(args, 0) : Text(args, 0).Replace(Text(args, 1), Text(args, 2), StringComparison.Ordinal);
}
