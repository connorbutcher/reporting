import { OperatorDefinition } from './operator-definition';

export class Operators {
  /**
   * The operators, loosest binding to tightest — the same table the server's parser uses, so the text
   * written from a sequence means on the server exactly what the sequence means here. They are grammar, not
   * catalogue functions, so — unlike functions — they are defined here rather than served by the API.
   * A `-` with nothing on its left is a negation (see {@link Operators.NEGATION_PRECEDENCE}).
   */
  public static readonly ALL: readonly OperatorDefinition[] = [
    {
      op: 'OR',
      symbol: 'OR',
      description: 'True when either side is true.',
      operandKind: 'bool',
      returnKind: 'bool',
      precedence: 1,
      associativity: 'left',
    },
    {
      op: 'AND',
      symbol: 'AND',
      description: 'True when both sides are true.',
      operandKind: 'bool',
      returnKind: 'bool',
      precedence: 2,
      associativity: 'left',
    },
    {
      op: 'NOT',
      symbol: 'NOT',
      description: 'Reverses the value that follows it.',
      operandKind: 'bool',
      returnKind: 'bool',
      precedence: 3,
      associativity: 'right',
      prefixOnly: true,
    },
    {
      op: '=',
      symbol: '=',
      description: 'Whether two values are equal.',
      operandKind: 'any',
      returnKind: 'bool',
      precedence: 4,
      associativity: 'none',
    },
    {
      op: '<>',
      symbol: '≠',
      description: 'Whether two values differ.',
      operandKind: 'any',
      returnKind: 'bool',
      precedence: 4,
      associativity: 'none',
    },
    {
      op: '>',
      symbol: '>',
      description: 'Whether the left value is greater.',
      operandKind: 'any',
      returnKind: 'bool',
      precedence: 4,
      associativity: 'none',
    },
    {
      op: '>=',
      symbol: '≥',
      description: 'Whether the left value is greater or equal.',
      operandKind: 'any',
      returnKind: 'bool',
      precedence: 4,
      associativity: 'none',
    },
    {
      op: '<',
      symbol: '<',
      description: 'Whether the left value is smaller.',
      operandKind: 'any',
      returnKind: 'bool',
      precedence: 4,
      associativity: 'none',
    },
    {
      op: '<=',
      symbol: '≤',
      description: 'Whether the left value is smaller or equal.',
      operandKind: 'any',
      returnKind: 'bool',
      precedence: 4,
      associativity: 'none',
    },
    {
      op: '&',
      symbol: '&',
      description: 'Joins two values into text; blanks contribute nothing.',
      operandKind: 'any',
      returnKind: 'text',
      precedence: 5,
      associativity: 'left',
    },
    {
      op: '+',
      symbol: '+',
      description: 'Adds two numbers.',
      operandKind: 'number',
      returnKind: 'number',
      precedence: 6,
      associativity: 'left',
    },
    {
      op: '-',
      symbol: '−',
      description:
        'Subtracts the number on the right from the one on the left; with nothing on its left, makes a number negative.',
      operandKind: 'number',
      returnKind: 'number',
      precedence: 6,
      associativity: 'left',
    },
    {
      op: '*',
      symbol: '×',
      description: 'Multiplies two numbers.',
      operandKind: 'number',
      returnKind: 'number',
      precedence: 7,
      associativity: 'left',
    },
    {
      op: '/',
      symbol: '÷',
      description:
        'Divides the number on the left by the one on the right; blank when that is zero.',
      operandKind: 'number',
      returnKind: 'number',
      precedence: 7,
      associativity: 'left',
    },
    {
      op: '%',
      symbol: '%',
      description: 'The remainder after dividing.',
      operandKind: 'number',
      returnKind: 'number',
      precedence: 7,
      associativity: 'left',
    },
    {
      op: '^',
      symbol: '^',
      description: 'Raises the number on the left to the power on the right.',
      operandKind: 'number',
      returnKind: 'number',
      precedence: 9,
      associativity: 'right',
    },
  ];

  /** A negation binds tighter than `*` and looser than `^`, so `-2 ^ 2` is `-(2 ^ 2)`. */
  public static readonly NEGATION_PRECEDENCE = 8;

  public static definition(op: string): OperatorDefinition | undefined {
    return Operators.ALL.find((o) => o.op === op);
  }

  /** Whether an operator can take a single value on its right instead of one on each side. */
  public static canBePrefix(op: string): boolean {
    return op === 'NOT' || op === '-';
  }

  /** The operator as the builder shows it (`*` shows as ×). */
  public static symbol(op: string): string {
    return Operators.definition(op)?.symbol ?? op;
  }
}
