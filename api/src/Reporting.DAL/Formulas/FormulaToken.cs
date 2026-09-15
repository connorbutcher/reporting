namespace Reporting.DAL.Formulas;

public readonly record struct FormulaToken(FormulaTokenKind Kind, string Text, int Position);
