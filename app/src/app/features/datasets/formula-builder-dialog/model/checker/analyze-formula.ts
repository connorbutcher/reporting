import { FormulaValueKind } from '../../../../../core/models/dataset';
import { Expression } from '../items/expression';
import { ExpressionAnalyzer } from './expression-analyzer';
import { FormulaAnalysis } from './formula-analysis';
import { FormulaIssue } from './formula-issue';
import { FormulaScope } from './formula-scope';

/**
 * Checks a formula without the server. What it finds — empty required arguments, wrong kinds, unknown
 * columns and functions, items that don't fit together — is what the user sees on the blocks; the server
 * is still asked afterwards, for its own verdict.
 */
export function analyzeFormula(root: Expression, scope: FormulaScope): FormulaAnalysis {
  const analyzer = new ExpressionAnalyzer(scope);
  const typed = analyzer.analyze(root);
  return { kind: typed?.kind ?? 'any', issues: analyzer.issues };
}

export function checkFormula(root: Expression, scope: FormulaScope): FormulaIssue[] {
  return analyzeFormula(root, scope).issues;
}

/** The kind of value an expression produces (issues found on the way are discarded). */
export function kindOfExpression(expression: Expression, scope: FormulaScope): FormulaValueKind {
  return new ExpressionAnalyzer(scope).analyze(expression)?.kind ?? 'any';
}
