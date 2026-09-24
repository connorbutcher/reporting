import { FormulaParameter } from '../../../../../core/models/dataset';

/** The parameter an argument answers to; arguments past the list belong to the repeating last parameter. */
export function parameterFor(params: readonly FormulaParameter[], index: number): FormulaParameter {
  return params[Math.min(index, params.length - 1)];
}

/**
 * Whether the argument at `index` may be left empty: an optional parameter, or the spare slot a repeating
 * parameter offers after its first (which is required).
 */
export function slotIsOptional(params: readonly FormulaParameter[], index: number): boolean {
  const param = parameterFor(params, index);
  return param.isOptional || (param.isVariadic && index >= params.length);
}
