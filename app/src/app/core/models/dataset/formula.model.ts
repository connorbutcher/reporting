import { DatasetColumnType } from './schema.model';

/** The kind of value a formula expression or function parameter deals in. `any` accepts (or follows) whatever it is given. */
export type FormulaValueKind = 'any' | 'number' | 'text' | 'bool' | 'date';

export type FormulaFunctionCategory = 'math' | 'text' | 'date' | 'logic' | 'conversion';

export interface FormulaParameter {
  name: string;
  kind: FormulaValueKind;
  isOptional: boolean;
  /** The last parameter may repeat, taking any number of further arguments. */
  isVariadic: boolean;
}

/** One function a formula can call, as the server's catalogue lists it. */
export interface FormulaFunction {
  name: string;
  category: FormulaFunctionCategory;
  description: string;
  example: string;
  returnKind: FormulaValueKind;
  parameters: FormulaParameter[];
}

/** A problem in a formula, with where it sits in the text. */
export interface FormulaError {
  message: string;
  position: number;
  length: number;
}

export interface FormulaPreviewRow {
  rowId: string;
  /** The computed value in the column's canonical text form; null when blank. */
  value: string | null;
  error: string | null;
}

export interface FormulaPreview {
  isValid: boolean;
  errors: FormulaError[];
  /** The column type the formula evaluates to; null when it can't be told statically. */
  inferredType: DatasetColumnType | null;
  rows: FormulaPreviewRow[];
}

export interface FormulaPreviewRequest {
  expression: string;
  type: DatasetColumnType | null;
  sampleSize: number;
}

/** Creates or replaces a formula column. A null type takes the type the formula produces. */
export interface SaveFormulaColumn {
  name: string;
  expression: string;
  type: DatasetColumnType | null;
}
