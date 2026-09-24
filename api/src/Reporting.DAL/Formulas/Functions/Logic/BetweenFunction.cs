using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Whether a number lies between a minimum and a maximum, inclusive.</summary>
public sealed class BetweenFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "BETWEEN";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = Number(args, 0);
        return value >= Number(args, 1) && value <= Number(args, 2);
    }
}
