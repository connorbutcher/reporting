using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Rounds to the nearest multiple; halves round away from zero, and a zero multiple gives a blank.</summary>
public sealed class MRoundFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "MROUND";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = Number(args, 0);
        var multiple = Math.Abs(Number(args, 1));
        if (multiple == 0)
        {
            return null;
        }

        return Rounding.RoundToMultiple(value, multiple);
    }
}
