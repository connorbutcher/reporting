using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>WEEKDAY(date)</c> — day of the week as 1 (Sunday) through 7 (Saturday), the common
/// spreadsheet convention.</summary>
public sealed class WeekdayFunction : IFormulaFunction
{
    public string Name => "WEEKDAY";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => (double)((int)FormulaValues.ToDate(args[0]).DayOfWeek + 1);
}
