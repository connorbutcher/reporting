using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>One number as a percentage of another; blank when the whole is zero.</summary>
public sealed class PercentOfFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "PERCENTOF";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var whole = Number(args, 1);
        if (whole == 0)
        {
            return null;
        }

        return Number(args, 0) / whole * 100;
    }
}
