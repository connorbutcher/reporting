using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The unit vocabulary DATEADD and DATEDIFF share: year, month, week, day, hour, minute, second.</summary>
internal static class DateUnits
{
    /// <summary>The unit named by the first argument, singular and lower case.</summary>
    public static string Parse(IReadOnlyList<object?> args)
    {
        var unit = Text(args, 0).Trim().ToLowerInvariant().TrimEnd('s');
        if (unit is "year" or "month" or "week" or "day" or "hour" or "minute" or "second") return unit;

        throw new FormulaEvaluationException($"'{Text(args, 0)}' isn't a date unit; use year, month, week, day, hour, minute or second.");
    }

    /// <summary>Completed calendar months from one date to another (negative when the end is earlier).</summary>
    public static int WholeMonths(DateTime start, DateTime end)
    {
        if (end < start) return -WholeMonths(end, start);

        var months = (end.Year - start.Year) * 12 + end.Month - start.Month;
        if (end.Day < start.Day || (end.Day == start.Day && end.TimeOfDay < start.TimeOfDay)) months--;
        return months;
    }
}
