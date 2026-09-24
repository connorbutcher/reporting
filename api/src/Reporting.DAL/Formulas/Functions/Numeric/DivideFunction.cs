using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Divides, giving the fallback (default blank) when the divisor is zero or blank.</summary>
public sealed class DivideFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "DIVIDE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (args[0] is not double numerator)
        {
            return null;
        }

        if (args[1] is double denominator && denominator != 0)
        {
            return numerator / denominator;
        }

        return args.Count > 2 ? args[2] : null;
    }
}
