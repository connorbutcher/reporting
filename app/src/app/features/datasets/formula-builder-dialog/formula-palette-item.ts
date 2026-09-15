import { DatasetColumn } from '../../../core/models/dataset';
import {
  FormulaBlock,
  FormulaOperator,
  boolBlock,
  columnBlock,
  functionBlock,
  numberBlock,
  operatorBlock,
  textBlock,
} from './formula-block.model';
import { FormulaFunctionSpec } from './formula-function-catalogue';

export type PaletteItem =
  | { kind: 'column'; column: DatasetColumn }
  | { kind: 'function'; spec: FormulaFunctionSpec }
  | { kind: 'operator'; op: FormulaOperator; label: string }
  | { kind: 'number' }
  | { kind: 'text' }
  | { kind: 'bool' };

export function createBlockFromPaletteItem(item: PaletteItem): FormulaBlock {
  switch (item.kind) {
    case 'column':
      return columnBlock(item.column.id, item.column.name);
    case 'function':
      return functionBlock(item.spec.name, item.spec.minArgs);
    case 'operator':
      return operatorBlock(item.op);
    case 'number':
      return numberBlock();
    case 'text':
      return textBlock();
    case 'bool':
      return boolBlock();
  }
}
