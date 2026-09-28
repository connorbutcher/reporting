using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The remainder after dividing, taking the divisor's sign; blank when dividing by zero.</summary>
public sealed class ModFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "MOD";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var divisor = Number(args, 1);
        if (divisor == 0)
        {
            return null;
        }

        var value = Number(args, 0);
        return value - divisor * Math.Floor(value / divisor);
    }
}
