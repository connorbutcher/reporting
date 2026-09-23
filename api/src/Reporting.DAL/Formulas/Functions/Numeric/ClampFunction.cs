using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Limits a number to a range; blank when the minimum exceeds the maximum.</summary>
public sealed class ClampFunction : IFormulaFunctionImplementation
{
    public string Key => "CLAMP";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Number(args, 1) > Number(args, 2) ? null : Math.Clamp(Number(args, 0), Number(args, 1), Number(args, 2));
}
