import { columnBlock, functionBlock, literalBlock, operatorItem } from '../factory/item-factory';
import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { SCOPE } from './test-catalogue';

export const col = columnBlock;
export const lit = literalBlock;
export const op = operatorItem;

/** A call to one of the catalogue's test functions, with an expression per argument. */
export function call(name: string, ...args: Expression[]): FormulaItem {
  return functionBlock(SCOPE.functions.get(name), name, args);
}
