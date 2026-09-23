using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Rounds away from zero to a number of decimal places.</summary>
public sealed class RoundUpFunction : IFormulaFunctionImplementation
{
    public string Key => "ROUNDUP";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Rounding.RoundTo(Number(args, 0), WholeNumber(args, 1, 0), Number(args, 0) >= 0 ? MidpointRounding.ToPositiveInfinity : MidpointRounding.ToNegativeInfinity);
}
