using Reporting.DAL.Formulas.Ast;

namespace Reporting.DAL.Formulas;

public sealed record FormulaValidationResult(FormulaNode Ast, IReadOnlySet<string> DependsOnColumnNames);
