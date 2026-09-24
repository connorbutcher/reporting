import { FormulaFunction, FormulaValueKind } from '../../../../../core/models/dataset';

/**
 * Which argument of `fn` a selection of the given kind should go into when wrapped in it: the first
 * parameter that takes that kind, else the first one — so wrapping a yes/no test in IF fills its condition.
 */
export function argumentForWrap(fn: FormulaFunction, kind: FormulaValueKind): number {
  const index = fn.parameters.findIndex((p) => p.kind === 'any' || kind === 'any' || p.kind === kind);
  return Math.max(index, 0);
}
