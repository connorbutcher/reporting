using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The day of the week, 1 (Sunday) to 7 (Saturday).</summary>
public sealed class WeekdayFunction : IFormulaFunctionImplementation
{
    public string Key => "WEEKDAY";

    public object? Invoke(IReadOnlyList<object?> args) =>
        (double)((int)Date(args, 0).DayOfWeek + 1);
}
