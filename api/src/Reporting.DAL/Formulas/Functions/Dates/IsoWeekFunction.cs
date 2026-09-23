using System.Globalization;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The ISO week number of the year.</summary>
public sealed class IsoWeekFunction : IFormulaFunctionImplementation
{
    public string Key => "ISOWEEK";

    public object? Invoke(IReadOnlyList<object?> args) =>
        (double)ISOWeek.GetWeekOfYear(Date(args, 0));
}
