using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The whole units from one date to another; negative when the end is earlier.</summary>
public sealed class DateDiffFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "DATEDIFF";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var unit = DateUnits.Parse(args);
        var start = Date(args, 1);
        var end = Date(args, 2);

        if (unit == "year")
        {
            return (double)(DateUnits.WholeMonths(start, end) / 12);
        }

        if (unit == "month")
        {
            return (double)DateUnits.WholeMonths(start, end);
        }

        var span = end - start;
        switch (unit)
        {
            case "week":
                return Math.Truncate(span.TotalDays / 7);
            case "day":
                return Math.Truncate(span.TotalDays);
            case "hour":
                return Math.Truncate(span.TotalHours);
            case "minute":
                return Math.Truncate(span.TotalMinutes);
            default:
                return Math.Truncate(span.TotalSeconds);
        }
    }
}
