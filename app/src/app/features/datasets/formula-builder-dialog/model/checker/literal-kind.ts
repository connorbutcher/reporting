import { FormulaValueKind } from '../../../../../core/models/dataset';
import { LiteralBlock } from '../items/literal-block';

export function literalKind(item: LiteralBlock): FormulaValueKind {
  if (item.value === null) {
    return 'any';
  }

  switch (typeof item.value) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'bool';
    default:
      return 'text';
  }
}
