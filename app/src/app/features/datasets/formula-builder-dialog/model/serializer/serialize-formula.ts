import { Expression } from '../items/expression';
import { FunctionBlock } from '../items/function-block';
import { FormulaWriter } from './formula-writer';
import { SerializedFormula } from './serialized-formula';
import { SlotDescription } from './slot-description';

/** Writes the formula as text, the way the server's parser reads it (see {@link FormulaWriter}). */
export function serializeFormula(root: Expression, describe: (call: FunctionBlock, index: number) => SlotDescription): SerializedFormula {
  return new FormulaWriter(describe).write(root);
}
