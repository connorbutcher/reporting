namespace Reporting.DAL.Formulas.Ast;

/// <summary>A prefix operator: <c>-</c> or <c>+</c>.</summary>
public sealed record UnaryNode(string Operator, FormulaNode Operand, int Position, int Length) : FormulaNode(Position, Length);
