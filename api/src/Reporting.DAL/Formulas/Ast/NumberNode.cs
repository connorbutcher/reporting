namespace Reporting.DAL.Formulas.Ast;

public sealed record NumberNode(double Value, int Position, int Length) : FormulaNode(Position, Length);
