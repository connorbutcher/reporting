/** The palette's function list — a client-side mirror of the server's whitelisted function set
 * (`Reporting.DAL.Formulas.Functions`, plus the null-aware built-ins `IF`/`COALESCE`/`ISBLANK`
 * handled directly by `FormulaEvaluator`), for display, default arg-slot counts, and per-slot
 * placeholder labels only. The server is still the sole authority on what a function actually
 * does; this never evaluates anything. */
export interface FormulaFunctionSpec {
  name: string;
  category: 'Math' | 'Logical' | 'Text' | 'Date';
  /** Shown under the palette entry, e.g. "number, digits?". */
  argHint: string;
  minArgs: number;
  /** `null` means variadic (MIN/MAX/CONCAT/COALESCE). */
  maxArgs: number | null;
  /** One label per fixed argument position, shown as that slot's placeholder in the canvas so a
   * function like IF reads as "condition / then / else" rather than three anonymous "value"
   * slots. A variadic trailing slot (past the end of this array) falls back to `argHint`'s last
   * segment — see `FormulaPaletteComponent.slotLabel`. */
  argNames: readonly string[];
  /** One line of plain-English help, shown in the palette on hover/focus. */
  description: string;
}

export const FORMULA_FUNCTIONS: readonly FormulaFunctionSpec[] = [
  // Math
  {
    name: 'ROUND',
    category: 'Math',
    argHint: 'number, digits?',
    minArgs: 1,
    maxArgs: 2,
    argNames: ['number', 'digits'],
    description: 'Rounds a number to the given number of decimal places (0 if omitted).',
  },
  {
    name: 'ABS',
    category: 'Math',
    argHint: 'number',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['number'],
    description: 'Absolute value — strips the sign.',
  },
  {
    name: 'CEILING',
    category: 'Math',
    argHint: 'number',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['number'],
    description: 'Rounds up to the nearest whole number.',
  },
  {
    name: 'FLOOR',
    category: 'Math',
    argHint: 'number',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['number'],
    description: 'Rounds down to the nearest whole number.',
  },
  {
    name: 'MOD',
    category: 'Math',
    argHint: 'number, divisor',
    minArgs: 2,
    maxArgs: 2,
    argNames: ['number', 'divisor'],
    description: 'The remainder left over after dividing number by divisor.',
  },
  {
    name: 'SQRT',
    category: 'Math',
    argHint: 'number',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['number'],
    description: 'Square root.',
  },
  {
    name: 'MIN',
    category: 'Math',
    argHint: 'number, …',
    minArgs: 1,
    maxArgs: null,
    argNames: ['number'],
    description: 'The smallest of two or more numbers.',
  },
  {
    name: 'MAX',
    category: 'Math',
    argHint: 'number, …',
    minArgs: 1,
    maxArgs: null,
    argNames: ['number'],
    description: 'The largest of two or more numbers.',
  },
  {
    name: 'POWER',
    category: 'Math',
    argHint: 'base, exponent',
    minArgs: 2,
    maxArgs: 2,
    argNames: ['base', 'exponent'],
    description: 'Raises base to the power of exponent.',
  },

  // Logical
  {
    name: 'IF',
    category: 'Logical',
    argHint: 'condition, then, else',
    minArgs: 3,
    maxArgs: 3,
    argNames: ['condition', 'then', 'else'],
    description: 'Evaluates to "then" when the condition is true, otherwise "else".',
  },
  {
    name: 'COALESCE',
    category: 'Logical',
    argHint: 'value, …',
    minArgs: 2,
    maxArgs: null,
    argNames: ['value'],
    description: 'The first value that isn’t blank, checked left to right.',
  },
  {
    name: 'ISBLANK',
    category: 'Logical',
    argHint: 'value',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['value'],
    description: 'True when the value is blank (an empty cell).',
  },

  // Text
  {
    name: 'CONCAT',
    category: 'Text',
    argHint: 'text, …',
    minArgs: 1,
    maxArgs: null,
    argNames: ['text'],
    description: 'Joins two or more values together as text.',
  },
  {
    name: 'UPPER',
    category: 'Text',
    argHint: 'text',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['text'],
    description: 'Converts text to UPPER CASE.',
  },
  {
    name: 'LOWER',
    category: 'Text',
    argHint: 'text',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['text'],
    description: 'Converts text to lower case.',
  },
  {
    name: 'TRIM',
    category: 'Text',
    argHint: 'text',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['text'],
    description: 'Removes leading and trailing whitespace.',
  },
  {
    name: 'LEN',
    category: 'Text',
    argHint: 'text',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['text'],
    description: 'The number of characters in text.',
  },
  {
    name: 'LEFT',
    category: 'Text',
    argHint: 'text, count',
    minArgs: 2,
    maxArgs: 2,
    argNames: ['text', 'count'],
    description: 'The first "count" characters of text.',
  },
  {
    name: 'RIGHT',
    category: 'Text',
    argHint: 'text, count',
    minArgs: 2,
    maxArgs: 2,
    argNames: ['text', 'count'],
    description: 'The last "count" characters of text.',
  },
  {
    name: 'REPLACE',
    category: 'Text',
    argHint: 'text, find, replaceWith',
    minArgs: 3,
    maxArgs: 3,
    argNames: ['text', 'find', 'replaceWith'],
    description: 'Replaces every occurrence of "find" with "replaceWith".',
  },
  {
    name: 'CONTAINS',
    category: 'Text',
    argHint: 'text, search',
    minArgs: 2,
    maxArgs: 2,
    argNames: ['text', 'search'],
    description: 'True when text contains "search" (case-insensitive).',
  },

  // Date
  {
    name: 'YEAR',
    category: 'Date',
    argHint: 'date',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['date'],
    description: 'The calendar year of a date.',
  },
  {
    name: 'MONTH',
    category: 'Date',
    argHint: 'date',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['date'],
    description: 'The month of a date, 1-12.',
  },
  {
    name: 'DAY',
    category: 'Date',
    argHint: 'date',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['date'],
    description: 'The day-of-month of a date, 1-31.',
  },
  {
    name: 'WEEKDAY',
    category: 'Date',
    argHint: 'date',
    minArgs: 1,
    maxArgs: 1,
    argNames: ['date'],
    description: 'The day of the week, 1 (Sunday) through 7 (Saturday).',
  },
  {
    name: 'DATEDIFF',
    category: 'Date',
    argHint: 'unit, from, to',
    minArgs: 3,
    maxArgs: 3,
    argNames: ['unit', 'from', 'to'],
    description: 'The gap between two dates, in "days", "months" or "years".',
  },
  {
    name: 'DATEADD',
    category: 'Date',
    argHint: 'unit, amount, date',
    minArgs: 3,
    maxArgs: 3,
    argNames: ['unit', 'amount', 'date'],
    description: 'Adds (or, with a negative amount, subtracts) "days", "months" or "years" from a date.',
  },
];

export const FORMULA_FUNCTION_CATEGORIES: readonly FormulaFunctionSpec['category'][] = [
  'Math',
  'Logical',
  'Text',
  'Date',
];

/** Looks up a function's spec by name (case-insensitive) — `undefined` for anything not in the
 * whitelist, e.g. a formula edited outside the builder or a stale reference. */
export function findFormulaFunction(name: string): FormulaFunctionSpec | undefined {
  return FORMULA_FUNCTIONS.find((f) => f.name.toUpperCase() === name.toUpperCase());
}

/** The placeholder label for one of a function's argument slots — its declared name, or (past the
 * end of a variadic function's named list) the last named slot repeated with a 1-based index, so a
 * COALESCE's third slot reads "value 3" rather than a bare "value" indistinguishable from the rest. */
export function formulaArgLabel(spec: FormulaFunctionSpec, slotIndex: number): string {
  if (slotIndex < spec.argNames.length) return spec.argNames[slotIndex];
  const last = spec.argNames[spec.argNames.length - 1] ?? 'value';
  return `${last} ${slotIndex + 1}`;
}
