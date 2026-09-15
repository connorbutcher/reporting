namespace Reporting.DAL.Formulas.Ast;

/// <summary>A <c>[Column Name]</c> reference, resolved against the dataset's columns by name.</summary>
public sealed record ColumnReference(string ColumnName) : FormulaNode;
