using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Dates;

/// <summary>The working days (Monday to Friday) from one date to another, counting both ends.</summary>
public sealed class NetworkDaysFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "NETWORKDAYS";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return (double)WorkingDays.Between(Date(args, 0), Date(args, 1));
    }
}
