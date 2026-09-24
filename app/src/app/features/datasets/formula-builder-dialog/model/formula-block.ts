import { DatasetColumnType, FormulaFunction, FormulaParameter, FormulaValueKind } from '../../../../core/models/dataset';

/**
 * A formula is an *expression*: an ordered sequence of items the user lays out — columns, values,
 * functions, bracket groups and bare operator symbols. The operators have no sides of their own; what
 * sits either side of one is simply whatever is next to it in the sequence. Reverse Polish notation
 * (see `formula-rpn.ts`) turns a sequence into a tree to validate and to write out as formula text.
 */
export type Expression = readonly FormulaItem[];

export type FormulaItem = OperandItem | OperatorItem;

/** An item that stands for a value. */
export type OperandItem = ColumnBlock | LiteralBlock | FunctionBlock | GroupBlock;

export interface ColumnBlock {
  kind: 'column';
  id: number;
  name: string;
}

export interface LiteralBlock {
  kind: 'literal';
  id: number;
  /** null is the blank literal, NULL. */
  value: number | string | boolean | null;
}

/** A call to a catalogue function. Each argument is an expression of its own. */
export interface FunctionBlock {
  kind: 'function';
  id: number;
  name: string;
  args: Expression[];
}

/** Brackets around an expression, to make it a single value. */
export interface GroupBlock {
  kind: 'group';
  id: number;
  body: Expression;
}

/** A bare operator symbol. What it applies to is decided by its neighbours in the sequence. */
export interface OperatorItem {
  kind: 'operator';
  id: number;
  /** As the formula language writes it: `+`, `*`, `<>`, `AND`… */
  op: string;
}

/** Which expression an item lives in: the formula's root, or an argument of a function (a group's body is argument 0). */
export interface ExpressionAddress {
  /** null for the root expression. */
  ownerId: number | null;
  arg: number;
}

export const ROOT: ExpressionAddress = { ownerId: null, arg: 0 };

export type OperatorAssociativity = 'left' | 'right' | 'none';

export interface OperatorDefinition {
  /** As the formula language writes it. */
  op: string;
  /** As the builder shows it. */
  symbol: string;
  description: string;
  /** What kind of value it takes on each side. */
  operandKind: FormulaValueKind;
  returnKind: FormulaValueKind;
  /** Binding strength; higher binds tighter. */
  precedence: number;
  associativity: OperatorAssociativity;
  /** Takes one value, on its right (NOT). */
  prefixOnly?: boolean;
}

/**
 * The operators, loosest binding to tightest — the same table the server's parser uses, so the text
 * written from a sequence means on the server exactly what the sequence means here. They are grammar, not
 * catalogue functions, so — unlike functions — they are defined here rather than served by the API.
 * A `-` with nothing to its left is a negation (see {@link NEGATION_PRECEDENCE}).
 */
export const OPERATORS: readonly OperatorDefinition[] = [
  { op: 'OR', symbol: 'OR', description: 'True when either side is true.', operandKind: 'bool', returnKind: 'bool', precedence: 1, associativity: 'left' },
  { op: 'AND', symbol: 'AND', description: 'True when both sides are true.', operandKind: 'bool', returnKind: 'bool', precedence: 2, associativity: 'left' },
  { op: 'NOT', symbol: 'NOT', description: 'Reverses the value that follows it.', operandKind: 'bool', returnKind: 'bool', precedence: 3, associativity: 'right', prefixOnly: true },
  { op: '=', symbol: '=', description: 'Whether two values are equal.', operandKind: 'any', returnKind: 'bool', precedence: 4, associativity: 'none' },
  { op: '<>', symbol: '≠', description: 'Whether two values differ.', operandKind: 'any', returnKind: 'bool', precedence: 4, associativity: 'none' },
  { op: '>', symbol: '>', description: 'Whether the left value is greater.', operandKind: 'any', returnKind: 'bool', precedence: 4, associativity: 'none' },
  { op: '>=', symbol: '≥', description: 'Whether the left value is greater or equal.', operandKind: 'any', returnKind: 'bool', precedence: 4, associativity: 'none' },
  { op: '<', symbol: '<', description: 'Whether the left value is smaller.', operandKind: 'any', returnKind: 'bool', precedence: 4, associativity: 'none' },
  { op: '<=', symbol: '≤', description: 'Whether the left value is smaller or equal.', operandKind: 'any', returnKind: 'bool', precedence: 4, associativity: 'none' },
  { op: '&', symbol: '&', description: 'Joins two values into text; blanks contribute nothing.', operandKind: 'any', returnKind: 'text', precedence: 5, associativity: 'left' },
  { op: '+', symbol: '+', description: 'Adds two numbers.', operandKind: 'number', returnKind: 'number', precedence: 6, associativity: 'left' },
  { op: '-', symbol: '−', description: 'Subtracts the number on the right from the one on the left; with nothing on its left, makes a number negative.', operandKind: 'number', returnKind: 'number', precedence: 6, associativity: 'left' },
  { op: '*', symbol: '×', description: 'Multiplies two numbers.', operandKind: 'number', returnKind: 'number', precedence: 7, associativity: 'left' },
  { op: '/', symbol: '÷', description: 'Divides the number on the left by the one on the right; blank when that is zero.', operandKind: 'number', returnKind: 'number', precedence: 7, associativity: 'left' },
  { op: '%', symbol: '%', description: 'The remainder after dividing.', operandKind: 'number', returnKind: 'number', precedence: 7, associativity: 'left' },
  { op: '^', symbol: '^', description: 'Raises the number on the left to the power on the right.', operandKind: 'number', returnKind: 'number', precedence: 9, associativity: 'right' },
];

/** A negation binds tighter than `*` and looser than `^`, so `-2 ^ 2` is `-(2 ^ 2)`. */
export const NEGATION_PRECEDENCE = 8;

export function operatorDefinition(op: string): OperatorDefinition | undefined {
  return OPERATORS.find((o) => o.op === op);
}

/** Whether an operator can take a single value on its right instead of one on each side. */
export function canBePrefix(op: string): boolean {
  return op === 'NOT' || op === '-';
}

export function operatorSymbol(op: string): string {
  return operatorDefinition(op)?.symbol ?? op;
}

let nextId = 1;

/** A fresh item id, unique for the life of the page. */
export function newItemId(): number {
  return nextId++;
}

export function columnBlock(name: string): ColumnBlock {
  return { kind: 'column', id: newItemId(), name };
}

export function literalBlock(value: LiteralBlock['value']): LiteralBlock {
  return { kind: 'literal', id: newItemId(), value };
}

export function operatorItem(op: string): OperatorItem {
  return { kind: 'operator', id: newItemId(), op };
}

export function groupBlock(body: Expression = []): GroupBlock {
  return { kind: 'group', id: newItemId(), body };
}

/** A function block with an empty argument per parameter (two for a repeating one, so it reads as a list). */
export function functionBlock(fn: FormulaFunction | undefined, name: string, args?: Expression[]): FunctionBlock {
  return { kind: 'function', id: newItemId(), name, args: args ?? emptyArguments(fn) };
}

export function emptyArguments(fn: FormulaFunction | undefined): Expression[] {
  if (!fn) return [];
  const args: Expression[] = fn.parameters.map(() => []);
  if (fn.parameters.at(-1)?.isVariadic) args.push([]);
  return args;
}

export function isOperand(item: FormulaItem): item is OperandItem {
  return item.kind !== 'operator';
}

/** The parameter an argument answers to; arguments past the list belong to the repeating last parameter. */
export function parameterFor(params: readonly FormulaParameter[], index: number): FormulaParameter {
  return params[Math.min(index, params.length - 1)];
}

/**
 * Whether the argument at `index` may be left empty: an optional parameter, or the spare slot a repeating
 * parameter offers after its first (which is required).
 */
export function slotIsOptional(params: readonly FormulaParameter[], index: number): boolean {
  const param = parameterFor(params, index);
  return param.isOptional || (param.isVariadic && index >= params.length);
}

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

export const KIND_LABELS: Record<FormulaValueKind, string> = {
  any: 'any value',
  number: 'a number',
  text: 'text',
  bool: 'a true/false value',
  date: 'a date',
};

/** Short badge text for a kind. */
export const KIND_BADGES: Record<FormulaValueKind, string> = {
  any: 'any',
  number: '123',
  text: 'Abc',
  bool: 'T/F',
  date: 'date',
};
