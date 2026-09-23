using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The whole units from one date to another; negative when the end is earlier.</summary>
public sealed class DateDiffFunction : IFormulaFunctionImplementation
{
    public string Key => "DATEDIFF";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var unit = DateUnits.Parse(args);
        var start = Date(args, 1);
        var end = Date(args, 2);

        if (unit is "year" or "month")
        {
            var months = DateUnits.WholeMonths(start, end);
            return (double)(unit == "year" ? months / 12 : months);
        }

        var span = end - start;
        return unit switch
        {
            "week" => Math.Truncate(span.TotalDays / 7),
            "day" => Math.Truncate(span.TotalDays),
            "hour" => Math.Truncate(span.TotalHours),
            "minute" => Math.Truncate(span.TotalMinutes),
            _ => Math.Truncate(span.TotalSeconds)
        };
    }
}
