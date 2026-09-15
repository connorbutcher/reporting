using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary>
/// The fixed set of functions a formula can call, each its own <see cref="IFormulaFunction"/> class,
/// looked up here by name (case-insensitive). IF/AND/OR/NOT aren't here: they're grammar-level
/// operators (see <c>FormulaParser</c>) with three-valued-logic null handling that doesn't fit
/// <see cref="IFormulaFunction"/>'s short-circuit-on-any-null contract.
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
        new ConcatFunction(),
        new UpperFunction(),
        new LowerFunction(),
        new TrimFunction(),
        new YearFunction(),
        new MonthFunction(),
        new DateDiffFunction(),
    }.ToDictionary(f => f.Name, StringComparer.OrdinalIgnoreCase);
}
