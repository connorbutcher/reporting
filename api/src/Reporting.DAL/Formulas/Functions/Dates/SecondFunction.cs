using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The second of a date and time, 0 to 59.</summary>
public sealed class SecondFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "SECOND";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return (double)Date(args, 0).Second;
    }
}
