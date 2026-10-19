using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The date a number of working days (Monday to Friday) after a date; blank past the calendar's ends.</summary>
public sealed class WorkdayFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "WORKDAY";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        try
        {
            return WorkingDays.Add(Date(args, 0), WholeNumber(args, 1, 0));
        }
        catch (ArgumentOutOfRangeException)
        {
            return null;
        }
    }
}
