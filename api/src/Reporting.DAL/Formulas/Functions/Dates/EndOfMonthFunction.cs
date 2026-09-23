using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The last day of the date's month.</summary>
public sealed class EndOfMonthFunction : IFormulaFunctionImplementation
{
    public string Key => "ENDOFMONTH";

    public object? Invoke(IReadOnlyList<object?> args) =>
        new DateTime(Date(args, 0).Year, Date(args, 0).Month, DateTime.DaysInMonth(Date(args, 0).Year, Date(args, 0).Month));
}
