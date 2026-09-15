namespace Reporting.DAL.Formulas.Ast;

/// <summary>Arithmetic (+ - * /), comparison (= &lt;&gt; &lt; &lt;= &gt; &gt;=), or boolean (AND/OR).</summary>
public sealed record BinaryOperation(string Operator, FormulaNode Left, FormulaNode Right) : FormulaNode;
