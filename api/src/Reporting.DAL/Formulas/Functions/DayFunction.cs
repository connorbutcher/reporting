using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>DAY(date)</c> — the day-of-month, 1-31.</summary>
public sealed class DayFunction : IFormulaFunction
{
    public string Name => "DAY";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => (double)FormulaValues.ToDate(args[0]).Day;
}
