namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>Shared by NETWORKDAYS and WORKDAY: Monday to Friday are working days.</summary>
internal static class WorkingDays
{
    public static bool IsWeekend(DateTime date)
    {
        return date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
    }

    /// <summary>The working days from one date to another, counting both ends (and negative when the end is earlier).</summary>
    public static int Between(DateTime start, DateTime end)
    {
        start = start.Date;
        end = end.Date;
        if (end < start)
        {
            return -Between(end, start);
        }

        var days = (end - start).Days + 1;
        var weeks = days / 7;
        var count = weeks * 5;
        for (var extra = 0; extra < days % 7; extra++)
        {
            if (!IsWeekend(start.AddDays(weeks * 7 + extra)))
            {
                count++;
            }
        }

        return count;
    }

    /// <summary>
    /// The date a number of working days after (or, when negative, before) a date. A start on a weekend counts
    /// from the working day it falls after (or before), so one working day after a Saturday is the Monday.
    /// </summary>
    public static DateTime Add(DateTime start, int workingDays)
    {
        var date = start.Date;
        if (workingDays == 0)
        {
            return date;
        }

        var direction = Math.Sign(workingDays);
        while (IsWeekend(date))
        {
            date = date.AddDays(-direction);
        }

        // Whole weeks first, then step over the remainder a day at a time (at most a weekend and four days).
        date = date.AddDays(workingDays / 5 * 7.0);
        var remaining = Math.Abs(workingDays % 5);
        while (remaining > 0)
        {
            date = date.AddDays(direction);
            if (!IsWeekend(date))
            {
                remaining--;
            }
        }

        return date;
    }
}
