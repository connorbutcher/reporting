namespace Reporting.DAL.Formulas;

/// <summary>
/// A formula parses but doesn't hold together against the dataset's schema — an unknown column, a
/// call to an unknown function, or the wrong number of arguments. Thrown by <see cref="FormulaValidator.Validate"/>.
/// </summary>
public sealed class FormulaValidationException(string message) : Exception(message);
