namespace Reporting.DAL.Formulas.Ast;

/// <summary>"-" (negate) or "NOT".</summary>
public sealed record UnaryOperation(string Operator, FormulaNode Operand) : FormulaNode;
