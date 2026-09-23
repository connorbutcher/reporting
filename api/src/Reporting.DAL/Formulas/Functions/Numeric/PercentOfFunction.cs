using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>One number as a percentage of another; blank when the whole is zero.</summary>
public sealed class PercentOfFunction : IFormulaFunctionImplementation
{
    public string Key => "PERCENTOF";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Number(args, 1) == 0 ? null : Number(args, 0) / Number(args, 1) * 100;
}
