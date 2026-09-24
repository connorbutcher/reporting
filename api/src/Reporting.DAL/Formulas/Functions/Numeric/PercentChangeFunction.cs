using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The percentage change from an old value to a new one; blank when the old value is zero.</summary>
public sealed class PercentChangeFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "PERCENTCHANGE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var previous = Number(args, 0);
        if (previous == 0)
        {
            return null;
        }

        return (Number(args, 1) - previous) / Math.Abs(previous) * 100;
    }
}
