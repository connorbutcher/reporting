namespace Reporting.DAL.Formulas.Ast;

public sealed record FunctionCall(string Name, IReadOnlyList<FormulaNode> Arguments) : FormulaNode;
