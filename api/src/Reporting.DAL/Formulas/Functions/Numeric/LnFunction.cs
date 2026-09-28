using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The natural logarithm; blank unless the number is positive.</summary>
public sealed class LnFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "LN";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = Number(args, 0);
        if (value <= 0)
        {
            return null;
        }

        return Math.Log(value);
    }
}
