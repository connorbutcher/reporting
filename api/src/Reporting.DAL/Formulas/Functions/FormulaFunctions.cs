using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary>
/// The fixed set of functions a formula can call, each its own <see cref="IFormulaFunction"/> class,
/// looked up here by name (case-insensitive). AND/OR/NOT are grammar-level operators (see
/// <c>FormulaParser</c>), and IF/COALESCE/ISBLANK are null-aware built-ins handled directly by
/// <c>FormulaEvaluator</c>/<c>FormulaValidator</c>/<c>FormulaTypeChecker</c> — none of the five are
/// here, since they don't fit <see cref="IFormulaFunction"/>'s short-circuit-on-any-null-argument
/// contract (three-valued logic for the operators, "look at a null without collapsing to null" for
/// IF/COALESCE/ISBLANK).
/// </summary>
public static class FormulaFunctions
{
    public static readonly IReadOnlyDictionary<string, IFormulaFunction> All = new List<IFormulaFunction>
    {
        new RoundFunction(),
        new AbsFunction(),
        new MinFunction(),
        new MaxFunction(),
        new PowerFunction(),
        new CeilingFunction(),
        new FloorFunction(),
        new ModFunction(),
        new SqrtFunction(),
        new ConcatFunction(),
        new UpperFunction(),
        new LowerFunction(),
        new TrimFunction(),
        new LenFunction(),
        new LeftFunction(),
        new RightFunction(),
        new ReplaceFunction(),
        new ContainsFunction(),
        new YearFunction(),
        new MonthFunction(),
        new DayFunction(),
        new WeekdayFunction(),
        new DateDiffFunction(),
        new DateAddFunction(),
    }.ToDictionary(f => f.Name, StringComparer.OrdinalIgnoreCase);
}
