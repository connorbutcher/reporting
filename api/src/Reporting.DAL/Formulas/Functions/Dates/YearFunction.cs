using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The year of a date.</summary>
public sealed class YearFunction : IFormulaFunctionImplementation
{
    public string Key => "YEAR";

    public object? Invoke(IReadOnlyList<object?> args) =>
        (double)Date(args, 0).Year;
}
