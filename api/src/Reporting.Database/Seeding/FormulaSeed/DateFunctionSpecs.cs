using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;
using static Reporting.Database.FormulaSeed.FormulaFunctionSpecs;

namespace Reporting.Database.FormulaSeed;

/// <summary>The date functions of the formula catalogue: their signatures and how they treat blanks. The code that runs each is on the server, under the same name.</summary>
public static class DateFunctionSpecs
{
    public static IReadOnlyList<FormulaFunctionSpec> All()
    {
        return
        [
            Strict("YEAR", Cat.Date, K.Number, "The year of a date.", "YEAR([Build Date])", Req("date", K.Date)),
            Strict("MONTH", Cat.Date, K.Number, "The month of a date, 1 to 12.", "MONTH([Build Date])", Req("date", K.Date)),
            Strict("DAY", Cat.Date, K.Number, "The day of the month, 1 to 31.", "DAY([Build Date])", Req("date", K.Date)),
            Strict("HOUR", Cat.Date, K.Number, "The hour of a date and time, 0 to 23.", "HOUR([Logged At])", Req("date", K.Date)),
            Strict("QUARTER", Cat.Date, K.Number, "The calendar quarter of a date, 1 to 4.", "QUARTER([Build Date])", Req("date", K.Date)),
            Strict("WEEKDAY", Cat.Date, K.Number, "The day of the week, 1 (Sunday) to 7 (Saturday).", "WEEKDAY([Build Date])", Req("date", K.Date)),
            Strict("ISOWEEK", Cat.Date, K.Number, "The ISO week number of the year, 1 to 53.", "ISOWEEK([Build Date])", Req("date", K.Date)),
            Strict("DATE", Cat.Date, K.Date, "Builds a date from a year, month and day. Blank when they don't make a real date.", "DATE([Year], [Month], 1)", Req("year", K.Number), Req("month", K.Number), Req("day", K.Number)),
            Strict("DATEADD", Cat.Date, K.Date, "Adds an amount of a unit (year, month, week, day, hour, minute or second) to a date.", "DATEADD(\"day\", 30, [Invoice Date])", Req("unit", K.Text), Req("amount", K.Number), Req("date", K.Date)),
            Strict("DATEDIFF", Cat.Date, K.Number, "The whole units (year, month, week, day, hour, minute or second) from one date to another; negative when the end is earlier.", "DATEDIFF(\"day\", [Ordered], [Shipped])", Req("unit", K.Text), Req("start", K.Date), Req("end", K.Date)),
            Strict("STARTOFMONTH", Cat.Date, K.Date, "The first day of the date's month.", "STARTOFMONTH([Build Date])", Req("date", K.Date)),
            Strict("ENDOFMONTH", Cat.Date, K.Date, "The last day of the date's month.", "ENDOFMONTH([Build Date])", Req("date", K.Date)),
        ];
    }
}
