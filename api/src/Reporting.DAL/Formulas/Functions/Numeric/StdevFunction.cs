using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The sample standard deviation of the numbers, ignoring blanks; blank with fewer than two.</summary>
public sealed class StdevFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "STDEV";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (Spread.SampleVariance(Numbers(args)) is not { } variance)
        {
            return null;
        }

        return Math.Sqrt(variance);
    }
}
