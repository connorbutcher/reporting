namespace Reporting.DAL.Formulas.Functions;

/// <summary>
/// The code behind a catalogue function. The database row says what the function is called, what it takes and
/// how blanks behave; this says what it does. Arguments arrive already checked against the row's parameter
/// kinds (so a Number parameter holds a <c>double</c>), and — for functions that don't handle blanks
/// themselves — already known to be non-blank. Return <c>null</c> for a blank result; throw
/// <see cref="Evaluation.FormulaEvaluationException"/> only for an argument that can never work (an unknown unit).
/// </summary>
public interface IFormulaFunctionImplementation
{
    /// <summary>Matches <c>FormulaFunctionDefinition.ImplementationKey</c>; compared case-insensitively.</summary>
    string Key { get; }

    object? Invoke(IReadOnlyList<object?> args);
}
