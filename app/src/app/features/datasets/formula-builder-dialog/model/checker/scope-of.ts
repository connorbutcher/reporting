import { DatasetColumn, FormulaFunction } from '../../../../../core/models/dataset';
import { FormulaScope } from './formula-scope';

export function scopeOf(functions: readonly FormulaFunction[], columns: readonly DatasetColumn[]): FormulaScope {
  const functionsByName = new Map<string, FormulaFunction>();
  for (const fn of functions) {
    functionsByName.set(fn.name.toUpperCase(), fn);
  }

  const columnsByName = new Map<string, DatasetColumn>();
  for (const column of columns) {
    columnsByName.set(column.name.toLowerCase(), column);
  }

  return { functions: functionsByName, columns: columnsByName };
}
