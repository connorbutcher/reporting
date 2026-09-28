import { FormulaFunction, FormulaValueKind } from '../../../../../core/models/dataset';
import { FunctionBlock } from '../items/function-block';
import { parameterFor } from '../parameters/parameter-lookup';
import { TypedValue } from './typed-value';

/**
 * For a function that returns whatever its `any` arguments are (IF, COALESCE): their shared kind, or `any`
 * if they differ. Arguments that are a bare NULL say nothing about the kind.
 */
export function commonKind(call: FunctionBlock, fn: FormulaFunction, kinds: readonly (TypedValue | null)[]): FormulaValueKind {
  let common: FormulaValueKind | null = null;

  for (let index = 0; index < kinds.length; index++) {
    const typed = kinds[index];
    if (common === 'any') {
      break;
    }

    if (!typed || typed.kind === 'any' || parameterFor(fn.parameters, index).kind !== 'any') {
      continue;
    }

    const expression = call.args[index];
    if (expression.length === 1 && expression[0].kind === 'literal' && expression[0].value === null) {
      continue;
    }

    common = common === null || common === typed.kind ? typed.kind : 'any';
  }

  return common ?? 'any';
}
