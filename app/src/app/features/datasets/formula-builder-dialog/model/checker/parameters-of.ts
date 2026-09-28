import { FormulaParameter } from '../../../../../core/models/dataset';
import { FunctionBlock } from '../items/function-block';
import { FormulaScope } from './formula-scope';

const NO_PARAMETERS: readonly FormulaParameter[] = [];

/** The parameters of a function block, from the catalogue (empty when it isn't there). */
export function parametersOf(block: FunctionBlock, scope: FormulaScope): readonly FormulaParameter[] {
  return scope.functions.get(block.name.toUpperCase())?.parameters ?? NO_PARAMETERS;
}
