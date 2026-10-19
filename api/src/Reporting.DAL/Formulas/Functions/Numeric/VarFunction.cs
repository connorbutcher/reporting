using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The sample variance of the numbers, ignoring blanks; blank with fewer than two.</summary>
public sealed class VarFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "VAR";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Spread.SampleVariance(Numbers(args));
    }
}
