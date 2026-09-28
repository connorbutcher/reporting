using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The last day of the date's month.</summary>
public sealed class EndOfMonthFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "ENDOFMONTH";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var date = Date(args, 0);
        return new DateTime(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month));
    }
}
