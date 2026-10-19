using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The day of the year, 1 to 366.</summary>
public sealed class DayOfYearFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "DAYOFYEAR";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return (double)Date(args, 0).DayOfYear;
    }
}
