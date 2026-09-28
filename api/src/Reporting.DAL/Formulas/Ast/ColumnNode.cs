namespace Reporting.DAL.Formulas.Ast;

/// <summary>A <c>[Column Name]</c> reference.</summary>
public sealed record ColumnNode(string Name, int Position, int Length) : FormulaNode(Position, Length);
