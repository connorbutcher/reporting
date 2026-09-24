import { DatasetColumn, FormulaFunction } from '../../../../../core/models/dataset';

/** What a checker needs to know: the callable functions and the columns a formula may read. */
export interface FormulaScope {
  /** Keyed by upper-case name. */
  functions: ReadonlyMap<string, FormulaFunction>;
  /** Keyed by lower-case name. */
  columns: ReadonlyMap<string, DatasetColumn>;
}
