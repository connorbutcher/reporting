using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Limits a number to a range; blank when the minimum exceeds the maximum.</summary>
public sealed class ClampFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "CLAMP";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var min = Number(args, 1);
        var max = Number(args, 2);
        if (min > max)
        {
            return null;
        }

        return Math.Clamp(Number(args, 0), min, max);
    }
}
