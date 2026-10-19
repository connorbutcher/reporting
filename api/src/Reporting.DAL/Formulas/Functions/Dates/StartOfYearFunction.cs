using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The first day of the date's year.</summary>
public sealed class StartOfYearFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "STARTOFYEAR";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return new DateTime(Date(args, 0).Year, 1, 1);
    }
}
