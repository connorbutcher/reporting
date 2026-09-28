namespace Reporting.DAL.Formulas.Ast;

public sealed record BoolNode(bool Value, int Position, int Length) : FormulaNode(Position, Length);
