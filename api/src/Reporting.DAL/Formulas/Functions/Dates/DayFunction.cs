using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The day of the month.</summary>
public sealed class DayFunction : IFormulaFunctionImplementation
{
    public string Key => "DAY";

    public object? Invoke(IReadOnlyList<object?> args) =>
        (double)Date(args, 0).Day;
}
