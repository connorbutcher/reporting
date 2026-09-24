using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>e raised to a power.</summary>
public sealed class ExpFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "EXP";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Math.Exp(Number(args, 0));
    }
}
