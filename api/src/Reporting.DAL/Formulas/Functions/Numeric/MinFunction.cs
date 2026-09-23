using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The smallest of the numbers, ignoring blanks.</summary>
public sealed class MinFunction : IFormulaFunctionImplementation
{
    public string Key => "MIN";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Numbers(args) is { Count: > 0 } n ? n.Min() : null;
}
