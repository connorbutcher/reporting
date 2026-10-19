using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The minute of a date and time, 0 to 59.</summary>
public sealed class MinuteFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "MINUTE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return (double)Date(args, 0).Minute;
    }
}
