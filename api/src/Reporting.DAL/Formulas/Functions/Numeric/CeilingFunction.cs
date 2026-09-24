using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Rounds up to the next whole number.</summary>
public sealed class CeilingFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "CEILING";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Math.Ceiling(Number(args, 0));
    }
}
