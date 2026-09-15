using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>DATEADD(unit, amount, date)</c> — <c>unit</c> is one of "days", "months", "years",
/// matching <see cref="DateDiffFunction"/>'s unit vocabulary; <c>amount</c> may be negative to
/// subtract.</summary>
public sealed class DateAddFunction : IFormulaFunction
{
    public string Name => "DATEADD";
    public int MinArgs => 3;
    public int MaxArgs => 3;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Date;

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var unit = FormulaValues.ToText(args[0]);
        var amount = FormulaValues.ToNumber(args[1]);
        var date = FormulaValues.ToDate(args[2]);

        return unit.Trim().ToLowerInvariant() switch
        {
            "day" or "days" => date.AddDays(amount),
            "month" or "months" => date.AddMonths((int)amount),
            "year" or "years" => date.AddYears((int)amount),
            _ => throw new FormulaEvaluationException($"Unknown DATEADD unit '{unit}' — use \"days\", \"months\", or \"years\"."),
        };
    }
}
