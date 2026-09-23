using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>Adds an amount of a unit to a date; blank when the result leaves the calendar.</summary>
public sealed class DateAddFunction : IFormulaFunctionImplementation
{
    public string Key => "DATEADD";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var unit = DateUnits.Parse(args);
        var amount = Number(args, 1);
        var date = Date(args, 2);

        try
        {
            return unit switch
            {
                "year" => date.AddYears((int)Math.Truncate(amount)),
                "month" => date.AddMonths((int)Math.Truncate(amount)),
                "week" => date.AddDays(amount * 7),
                "day" => date.AddDays(amount),
                "hour" => date.AddHours(amount),
                "minute" => date.AddMinutes(amount),
                _ => date.AddSeconds(amount)
            };
        }
        catch (ArgumentOutOfRangeException)
        {
            return null; // ran off the end of the calendar
        }
    }
}
