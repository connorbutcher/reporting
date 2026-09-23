using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The first day of the date's month.</summary>
public sealed class StartOfMonthFunction : IFormulaFunctionImplementation
{
    public string Key => "STARTOFMONTH";

    public object? Invoke(IReadOnlyList<object?> args) =>
        new DateTime(Date(args, 0).Year, Date(args, 0).Month, 1);
}
