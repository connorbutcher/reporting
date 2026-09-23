using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The hour of a date and time, 0 to 23.</summary>
public sealed class HourFunction : IFormulaFunctionImplementation
{
    public string Key => "HOUR";

    public object? Invoke(IReadOnlyList<object?> args) =>
        (double)Date(args, 0).Hour;
}
