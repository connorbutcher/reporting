using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>Rounds down to the previous whole number.</summary>
public sealed class FloorFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "FLOOR";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Math.Floor(Number(args, 0));
    }
}
