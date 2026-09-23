using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The percentage change from an old value to a new one; blank when the old value is zero.</summary>
public sealed class PercentChangeFunction : IFormulaFunctionImplementation
{
    public string Key => "PERCENTCHANGE";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Number(args, 0) == 0 ? null : (Number(args, 1) - Number(args, 0)) / Math.Abs(Number(args, 0)) * 100;
}
