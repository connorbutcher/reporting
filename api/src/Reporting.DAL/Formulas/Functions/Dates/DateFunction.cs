using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>Builds a date from a year, month and day; blank when they aren't a real date.</summary>
public sealed class DateFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "DATE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var year = WholeNumber(args, 0, 0);
        var month = WholeNumber(args, 1, 0);
        var day = WholeNumber(args, 2, 0);
        if (year is < 1 or > 9999 || month is < 1 or > 12 || day < 1 || day > DateTime.DaysInMonth(year, month))
        {
            return null;
        }

        return new DateTime(year, month, day);
    }
}
