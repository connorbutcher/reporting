using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Whether a number lies between a minimum and a maximum, inclusive.</summary>
public sealed class BetweenFunction : IFormulaFunctionImplementation
{
    public string Key => "BETWEEN";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Number(args, 0) >= Number(args, 1) && Number(args, 0) <= Number(args, 2);
}
