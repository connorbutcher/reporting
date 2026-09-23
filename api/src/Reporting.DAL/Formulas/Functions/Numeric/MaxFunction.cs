using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The largest of the numbers, ignoring blanks.</summary>
public sealed class MaxFunction : IFormulaFunctionImplementation
{
    public string Key => "MAX";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Numbers(args) is { Count: > 0 } n ? n.Max() : null;
}
