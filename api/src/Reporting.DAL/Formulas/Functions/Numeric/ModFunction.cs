using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The remainder after dividing, taking the divisor's sign; blank when dividing by zero.</summary>
public sealed class ModFunction : IFormulaFunctionImplementation
{
    public string Key => "MOD";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Number(args, 1) == 0 ? null : Number(args, 0) - Number(args, 1) * Math.Floor(Number(args, 0) / Number(args, 1));
}
