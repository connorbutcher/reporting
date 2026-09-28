using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The square root; blank for a negative number.</summary>
public sealed class SqrtFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "SQRT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = Number(args, 0);
        if (value < 0)
        {
            return null;
        }

        return Math.Sqrt(value);
    }
}
