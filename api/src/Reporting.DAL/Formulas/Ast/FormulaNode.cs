namespace Reporting.DAL.Formulas.Ast;

/// <summary>A parsed formula expression. Each node remembers its span in the source text so problems can be pointed at.</summary>
public abstract record FormulaNode(int Position, int Length);
