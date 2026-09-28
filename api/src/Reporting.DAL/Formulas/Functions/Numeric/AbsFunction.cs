using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The absolute value.</summary>
public sealed class AbsFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "ABS";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Math.Abs(Number(args, 0));
    }
}
