using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>Adds an amount of a unit to a date; blank when the result leaves the calendar.</summary>
public sealed class DateAddFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "DATEADD";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var unit = DateUnits.Parse(args);
        var amount = Number(args, 1);
        var date = Date(args, 2);

        try
        {
            switch (unit)
            {
                case "year":
                    return date.AddYears((int)Math.Truncate(amount));
                case "month":
                    return date.AddMonths((int)Math.Truncate(amount));
                case "week":
                    return date.AddDays(amount * 7);
                case "day":
                    return date.AddDays(amount);
                case "hour":
                    return date.AddHours(amount);
                case "minute":
                    return date.AddMinutes(amount);
                default:
                    return date.AddSeconds(amount);
            }
        }
        catch (ArgumentOutOfRangeException)
        {
            return null; // ran off the end of the calendar
        }
    }
}
