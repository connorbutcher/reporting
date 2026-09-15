namespace Reporting.DAL.Formulas;

/// <summary>
/// Raised mid-evaluation for a row where the formula's operator/function types don't line up (e.g.
/// arithmetic on a non-numeric value). Always caught by the evaluation caller and turned into a null
/// cell for that one row — it never surfaces past the <c>Formulas</c> layer.
/// </summary>
public sealed class FormulaEvaluationException(string message) : Exception(message);
