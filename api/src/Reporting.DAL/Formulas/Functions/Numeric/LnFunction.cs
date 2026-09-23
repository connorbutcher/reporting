using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The natural logarithm; blank unless the number is positive.</summary>
public sealed class LnFunction : IFormulaFunctionImplementation
{
    public string Key => "LN";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Number(args, 0) <= 0 ? null : Math.Log(Number(args, 0));
}
