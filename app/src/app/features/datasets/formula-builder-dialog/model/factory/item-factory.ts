import { FormulaFunction } from '../../../../../core/models/dataset';
import { ColumnBlock } from '../items/column-block';
import { Expression } from '../items/expression';
import { FunctionBlock } from '../items/function-block';
import { GroupBlock } from '../items/group-block';
import { LiteralBlock } from '../items/literal-block';
import { OperatorItem } from '../items/operator-item';
import { newItemId } from './item-id';

export function columnBlock(name: string): ColumnBlock {
  return { kind: 'column', id: newItemId(), name };
}

export function literalBlock(value: LiteralBlock['value']): LiteralBlock {
  return { kind: 'literal', id: newItemId(), value };
}

export function operatorItem(op: string): OperatorItem {
  return { kind: 'operator', id: newItemId(), op };
}

export function groupBlock(body: Expression = []): GroupBlock {
  return { kind: 'group', id: newItemId(), body };
}

/** A function block with an empty argument per parameter (two for a repeating one, so it reads as a list). */
export function functionBlock(fn: FormulaFunction | undefined, name: string, args?: Expression[]): FunctionBlock {
  return { kind: 'function', id: newItemId(), name, args: args ?? emptyArguments(fn) };
}

export function emptyArguments(fn: FormulaFunction | undefined): Expression[] {
  if (!fn) {
    return [];
  }

  const args: Expression[] = fn.parameters.map(() => []);
  if (fn.parameters.at(-1)?.isVariadic) {
    args.push([]);
  }

  return args;
}
