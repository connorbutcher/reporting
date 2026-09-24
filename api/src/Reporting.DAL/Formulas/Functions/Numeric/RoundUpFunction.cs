using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Rounds away from zero to a number of decimal places.</summary>
public sealed class RoundUpFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "ROUNDUP";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = Number(args, 0);
        var mode = value >= 0 ? MidpointRounding.ToPositiveInfinity : MidpointRounding.ToNegativeInfinity;
        return Rounding.RoundTo(value, WholeNumber(args, 1, 0), mode);
    }
}
