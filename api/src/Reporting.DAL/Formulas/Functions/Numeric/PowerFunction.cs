using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>A number raised to a power.</summary>
public sealed class PowerFunction : IFormulaFunctionImplementation
{
    public string Key => "POWER";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Math.Pow(Number(args, 0), Number(args, 1));
}
