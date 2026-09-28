using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The calendar quarter of a date, 1 to 4.</summary>
public sealed class QuarterFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "QUARTER";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return (double)((Date(args, 0).Month - 1) / 3 + 1);
    }
}
