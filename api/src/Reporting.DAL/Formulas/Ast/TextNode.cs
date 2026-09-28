namespace Reporting.DAL.Formulas.Ast;

public sealed record TextNode(string Value, int Position, int Length) : FormulaNode(Position, Length);
