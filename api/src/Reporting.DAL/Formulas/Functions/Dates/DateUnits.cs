using Reporting.DAL.Formulas.Evaluation;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The unit vocabulary DATEADD and DATEDIFF share: year, month, week, day, hour, minute, second.</summary>
internal static class DateUnits
{
    /// <summary>The unit named by the first argument, singular and lower case.</summary>
    public static string Parse(IReadOnlyList<object?> args)
    {
        var unit = Text(args, 0).Trim().ToLowerInvariant().TrimEnd('s');
        switch (unit)
        {
            case "year":
            case "month":
            case "week":
            case "day":
            case "hour":
            case "minute":
            case "second":
                return unit;
            default:
                throw new FormulaEvaluationException(
                    $"'{Text(args, 0)}' isn't a date unit; use year, month, week, day, hour, minute or second.");
        }
    }

    /// <summary>Completed calendar months from one date to another (negative when the end is earlier).</summary>
    public static int WholeMonths(DateTime start, DateTime end)
    {
        if (end < start)
        {
            return -WholeMonths(end, start);
        }

        var months = (end.Year - start.Year) * 12 + end.Month - start.Month;
        var notYetReached = end.Day < start.Day || (end.Day == start.Day && end.TimeOfDay < start.TimeOfDay);
        return notYetReached ? months - 1 : months;
    }
}
