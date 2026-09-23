using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Rounds toward zero to a number of decimal places.</summary>
public sealed class RoundDownFunction : IFormulaFunctionImplementation
{
    public string Key => "ROUNDDOWN";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Rounding.RoundTo(Number(args, 0), WholeNumber(args, 1, 0), MidpointRounding.ToZero);
}
