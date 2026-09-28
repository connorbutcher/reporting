namespace Reporting.DAL.Formulas.Ast;

/// <summary>The literal NULL — a blank value.</summary>
public sealed record NullNode(int Position, int Length) : FormulaNode(Position, Length);
