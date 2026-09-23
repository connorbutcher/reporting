using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Rounds to a number of decimal places, halves away from zero.</summary>
public sealed class RoundFunction : IFormulaFunctionImplementation
{
    public string Key => "ROUND";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Rounding.RoundTo(Number(args, 0), WholeNumber(args, 1, 0), MidpointRounding.AwayFromZero);
}
