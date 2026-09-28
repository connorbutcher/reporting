import { DatasetColumnType, FormulaValueKind } from '../../../../../core/models/dataset';

export function columnTypeKind(type: DatasetColumnType): FormulaValueKind {
  switch (type) {
    case 'int':
    case 'double':
      return 'number';
    case 'bool':
      return 'bool';
    case 'dateTime':
      return 'date';
    default:
      return 'text';
  }
}

/** The column type a formula of this kind naturally produces; null when the kind can't be told. */
export function naturalColumnType(kind: FormulaValueKind): DatasetColumnType | null {
  switch (kind) {
    case 'number':
      return 'double';
    case 'text':
      return 'string';
    case 'bool':
      return 'bool';
    case 'date':
      return 'dateTime';
    default:
      return null;
  }
}
