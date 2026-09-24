import { DatasetColumn, FormulaFunction, FormulaParameter, FormulaValueKind } from '../../../../../core/models/dataset';
import { scopeOf } from '../checker/scope-of';

function param(name: string, kind: FormulaValueKind, extra: Partial<FormulaParameter> = {}): FormulaParameter {
  return { name, kind, isOptional: false, isVariadic: false, ...extra };
}

function fn(name: string, returnKind: FormulaValueKind, ...parameters: FormulaParameter[]): FormulaFunction {
  return { name, category: 'math', description: '', example: '', returnKind, parameters };
}

function column(name: string, type: DatasetColumn['type']): DatasetColumn {
  return { id: name, name, type, order: 0, configuration: { kind: 'text' } };
}

export const TEST_FUNCTIONS: FormulaFunction[] = [
  fn('ROUND', 'number', param('number', 'number'), param('digits', 'number', { isOptional: true })),
  fn('UPPER', 'text', param('text', 'text')),
  fn('IF', 'any', param('condition', 'bool'), param('then', 'any'), param('else', 'any')),
  fn('ISBLANK', 'bool', param('value', 'any')),
  fn('SUM', 'number', param('number', 'number', { isVariadic: true })),
  fn('DATEADD', 'date', param('unit', 'text'), param('amount', 'number'), param('date', 'date')),
];

export const TEST_COLUMNS: DatasetColumn[] = [
  column('Qty', 'int'),
  column('Price', 'double'),
  column('Region', 'string'),
  column('Ordered', 'dateTime'),
  column('Shipped', 'bool'),
];

export const SCOPE = scopeOf(TEST_FUNCTIONS, TEST_COLUMNS);
