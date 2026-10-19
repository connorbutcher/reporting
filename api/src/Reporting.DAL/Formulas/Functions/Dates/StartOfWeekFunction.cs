using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The Monday that starts the date's (ISO) week.</summary>
public sealed class StartOfWeekFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "STARTOFWEEK";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var date = Date(args, 0).Date;
        var daysSinceMonday = ((int)date.DayOfWeek + 6) % 7;
        if (date < DateTime.MinValue.AddDays(daysSinceMonday))
        {
            return null;
        }

        return date.AddDays(-daysSinceMonday);
    }
}
