using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The month of a date, 1 to 12.</summary>
public sealed class MonthFunction : IFormulaFunctionImplementation
{
    public string Key => "MONTH";

    public object? Invoke(IReadOnlyList<object?> args) =>
        (double)Date(args, 0).Month;
}
