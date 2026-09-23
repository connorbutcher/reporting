using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>e raised to a power.</summary>
public sealed class ExpFunction : IFormulaFunctionImplementation
{
    public string Key => "EXP";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Math.Exp(Number(args, 0));
}
