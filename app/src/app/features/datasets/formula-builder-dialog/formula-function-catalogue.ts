/** The palette's function list — a client-side mirror of the server's whitelisted function set
 * (`Reporting.DAL.Formulas.Functions`), for display and default arg-slot counts only. The server
 * is still the sole authority on what a function actually does; this never evaluates anything. */
export interface FormulaFunctionSpec {
  name: string;
  category: 'Math' | 'Logical' | 'Text' | 'Date';
  /** Shown under the palette entry, e.g. "number, digits?". */
  argHint: string;
  minArgs: number;
  /** `null` means variadic (MIN/MAX/CONCAT). */
  maxArgs: number | null;
}

export const FORMULA_FUNCTIONS: readonly FormulaFunctionSpec[] = [
  { name: 'ROUND', category: 'Math', argHint: 'number, digits?', minArgs: 1, maxArgs: 2 },
  { name: 'ABS', category: 'Math', argHint: 'number', minArgs: 1, maxArgs: 1 },
  { name: 'MIN', category: 'Math', argHint: 'number, …', minArgs: 1, maxArgs: null },
  { name: 'MAX', category: 'Math', argHint: 'number, …', minArgs: 1, maxArgs: null },
  { name: 'POWER', category: 'Math', argHint: 'base, exponent', minArgs: 2, maxArgs: 2 },
  { name: 'IF', category: 'Logical', argHint: 'condition, then, else', minArgs: 3, maxArgs: 3 },
  { name: 'CONCAT', category: 'Text', argHint: 'text, …', minArgs: 1, maxArgs: null },
  { name: 'UPPER', category: 'Text', argHint: 'text', minArgs: 1, maxArgs: 1 },
  { name: 'LOWER', category: 'Text', argHint: 'text', minArgs: 1, maxArgs: 1 },
  { name: 'TRIM', category: 'Text', argHint: 'text', minArgs: 1, maxArgs: 1 },
  { name: 'YEAR', category: 'Date', argHint: 'date', minArgs: 1, maxArgs: 1 },
  { name: 'MONTH', category: 'Date', argHint: 'date', minArgs: 1, maxArgs: 1 },
  { name: 'DATEDIFF', category: 'Date', argHint: 'unit, from, to', minArgs: 3, maxArgs: 3 },
];

export const FORMULA_FUNCTION_CATEGORIES: readonly FormulaFunctionSpec['category'][] = [
  'Math',
  'Logical',
  'Text',
  'Date',
];
