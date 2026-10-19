using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The first day of the date's calendar quarter.</summary>
public sealed class StartOfQuarterFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "STARTOFQUARTER";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var date = Date(args, 0);
        return new DateTime(date.Year, (date.Month - 1) / 3 * 3 + 1, 1);
    }
}
