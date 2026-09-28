using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The first day of the date's month.</summary>
public sealed class StartOfMonthFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "STARTOFMONTH";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var date = Date(args, 0);
        return new DateTime(date.Year, date.Month, 1);
    }
}
