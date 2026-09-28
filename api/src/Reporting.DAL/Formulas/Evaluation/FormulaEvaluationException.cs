namespace Reporting.DAL.Formulas.Evaluation;

/// <summary>A formula that is valid can still fail on a particular row (a wrong-typed value, an unknown unit); that row's result is blank.</summary>
public sealed class FormulaEvaluationException(string message) : Exception(message);
