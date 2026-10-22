import {
  DatasetColumn,
  FormulaFunction,
  FormulaParameter,
  FormulaValueKind,
} from '../../../../../core/models/dataset';
import { Expression } from '../items/expression';
import { ExpressionAnalyzer } from './expression-analyzer';
import { FormulaAnalysis } from './formula-analysis';
import { FormulaIssue } from './formula-issue';
import { FormulaScope } from './formula-scope';
import { FunctionBlock } from '../items/function-block';

/** Checks formulas without the server; the server is still asked afterwards for its own verdict. */
export class FormulaChecker {
  private static readonly NO_PARAMETERS: readonly FormulaParameter[] = [];

  /** Client-side check shown on the blocks; the server still gives its own verdict. */
  public static analyze(root: Expression, scope: FormulaScope): FormulaAnalysis {
    const analyzer = new ExpressionAnalyzer(scope);
    const typed = analyzer.analyze(root);
    return { kind: typed?.kind ?? 'any', issues: analyzer.issues };
  }

  public static check(root: Expression, scope: FormulaScope): FormulaIssue[] {
    return FormulaChecker.analyze(root, scope).issues;
  }

  /** The kind of value an expression produces (issues found on the way are discarded). */
  public static kindOf(expression: Expression, scope: FormulaScope): FormulaValueKind {
    return new ExpressionAnalyzer(scope).analyze(expression)?.kind ?? 'any';
  }

  /** The parameters of a function block, from the catalogue (empty when it isn't there). */
  public static parametersOf(
    block: FunctionBlock,
    scope: FormulaScope,
  ): readonly FormulaParameter[] {
    return (
      scope.functions.get(block.name.toUpperCase())?.parameters ?? FormulaChecker.NO_PARAMETERS
    );
  }

  public static scope(
    functions: readonly FormulaFunction[],
    columns: readonly DatasetColumn[],
  ): FormulaScope {
    const functionsByName = new Map<string, FormulaFunction>();
    for (const fn of functions) {
      functionsByName.set(fn.name.toUpperCase(), fn);
    }

    const columnsByName = new Map<string, DatasetColumn>();
    for (const column of columns) {
      columnsByName.set(column.name.toLowerCase(), column);
    }

    return { functions: functionsByName, columns: columnsByName };
  }
}
