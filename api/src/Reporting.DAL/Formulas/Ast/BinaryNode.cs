namespace Reporting.DAL.Formulas.Ast;

/// <summary>An infix operator: arithmetic (<c>+ - * / % ^</c>), text join (<c>&amp;</c>) or comparison (<c>= &lt;&gt; &lt; &lt;= &gt; &gt;=</c>). AND/OR/NOT are ordinary function calls.</summary>
public sealed record BinaryNode(string Operator, FormulaNode Left, FormulaNode Right, int Position, int Length) : FormulaNode(Position, Length);
