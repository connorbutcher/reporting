import {
  FormulaFunction,
  FormulaParameter,
  FormulaValueKind,
} from '../../../../../core/models/dataset';

/** Which parameter of a function each argument answers to. */
export class FormulaParameters {
  /** The parameter an argument answers to; arguments past the list belong to the repeating last parameter. */
  public static forArgument(params: readonly FormulaParameter[], index: number): FormulaParameter {
    return params[Math.min(index, params.length - 1)];
  }

  /**
   * Whether the argument at `index` may be left empty: an optional parameter, or the spare slot a repeating
   * parameter offers after its first (which is required).
   */
  public static slotIsOptional(params: readonly FormulaParameter[], index: number): boolean {
    const param = FormulaParameters.forArgument(params, index);
    return param.isOptional || (param.isVariadic && index >= params.length);
  }

  /**
   * Which argument of `fn` a selection of the given kind should go into when wrapped in it: the first
   * parameter that takes that kind, else the first one — so wrapping a yes/no test in IF fills its condition.
   */
  public static argumentForWrap(fn: FormulaFunction, kind: FormulaValueKind): number {
    const index = fn.parameters.findIndex(
      (p) => p.kind === 'any' || kind === 'any' || p.kind === kind,
    );
    return Math.max(index, 0);
  }
}
