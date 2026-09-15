using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>DATEDIFF(unit, from, to)</c> — <c>unit</c> is one of "days", "hours", "months", "years".</summary>
public sealed class DateDiffFunction : IFormulaFunction
{
    public string Name => "DATEDIFF";
    public int MinArgs => 3;
    public int MaxArgs => 3;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var unit = FormulaValues.ToText(args[0]);
        var from = FormulaValues.ToDate(args[1]);
        var to = FormulaValues.ToDate(args[2]);

        return unit.Trim().ToLowerInvariant() switch
        {
            "day" or "days" => (to - from).TotalDays,
            "hour" or "hours" => (to - from).TotalHours,
            "month" or "months" => ((to.Year - from.Year) * 12) + (to.Month - from.Month),
            "year" or "years" => to.Year - from.Year,
            _ => throw new FormulaEvaluationException($"Unknown DATEDIFF unit '{unit}' — use \"days\", \"months\", or \"years\"."),
        };
    }
}
