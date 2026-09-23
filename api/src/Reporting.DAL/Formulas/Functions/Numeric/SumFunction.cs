using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The total of the numbers, ignoring blanks.</summary>
public sealed class SumFunction : IFormulaFunctionImplementation
{
    public string Key => "SUM";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Numbers(args) is { Count: > 0 } n ? n.Sum() : null;
}
