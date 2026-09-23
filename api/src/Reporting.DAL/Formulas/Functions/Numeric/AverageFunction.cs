using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The mean of the numbers, ignoring blanks.</summary>
public sealed class AverageFunction : IFormulaFunctionImplementation
{
    public string Key => "AVERAGE";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Numbers(args) is { Count: > 0 } n ? n.Average() : null;
}
