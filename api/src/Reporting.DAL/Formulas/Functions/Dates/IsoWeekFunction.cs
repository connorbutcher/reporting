using System.Globalization;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The ISO week number of the year.</summary>
public sealed class IsoWeekFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "ISOWEEK";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return (double)ISOWeek.GetWeekOfYear(Date(args, 0));
    }
}
