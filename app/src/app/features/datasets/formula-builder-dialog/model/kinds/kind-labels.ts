import { FormulaValueKind } from '../../../../../core/models/dataset';

export const KIND_LABELS: Record<FormulaValueKind, string> = {
  any: 'any value',
  number: 'a number',
  text: 'text',
  bool: 'a true/false value',
  date: 'a date',
};
