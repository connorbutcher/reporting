namespace Reporting.DAL.Formulas;

/// <summary>The formula text isn't well formed. Carries where, so an editor can underline it.</summary>
public sealed class FormulaSyntaxException(string message, int position, int length) : Exception(message)
{
    public int Position { get; } = position;
    public int Length { get; } = length;
}

/// <summary>A formula that is valid can still fail on a particular row (a wrong-typed value, an unknown unit); that row's result is blank.</summary>
public sealed class FormulaEvaluationException(string message) : Exception(message);
