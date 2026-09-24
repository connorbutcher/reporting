using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>A number raised to a power.</summary>
public sealed class PowerFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "POWER";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Math.Pow(Number(args, 0), Number(args, 1));
    }
}
