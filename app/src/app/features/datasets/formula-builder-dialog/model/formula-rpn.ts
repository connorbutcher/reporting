import {
  Expression,
  FormulaItem,
  NEGATION_PRECEDENCE,
  OperandItem,
  OperatorItem,
  canBePrefix,
  operatorDefinition,
  operatorSymbol,
} from './formula-block';

/** A problem with how a sequence of items fits together, on the item it is about. */
export interface RpnIssue {
  blockId: number;
  message: string;
}

/** One token of the reverse Polish form. A `missing` operand stands in for a value the user hasn't put down yet. */
export type RpnToken =
  | { type: 'operand'; item: OperandItem }
  | { type: 'missing'; operatorId: number | null }
  | { type: 'operator'; item: OperatorItem; unary: boolean };

export interface Rpn {
  tokens: RpnToken[];
  issues: RpnIssue[];
}

interface Pending {
  item: OperatorItem;
  unary: boolean;
  precedence: number;
}

/**
 * Converts an expression — the items in the order the user placed them — to reverse Polish notation with
 * the shunting-yard algorithm, using the language's operator precedence and associativity. It does not stop
 * at a mistake: a missing value becomes a `missing` token and the problem is recorded, so the result is
 * always well formed and the user is told about every gap at once.
 *
 * Because an operator is just a symbol in the sequence, what it applies to is worked out here: `a + b × c`
 * becomes `a b c × +`, and a `-` with nothing before it is a negation.
 */
export function toRpn(expression: Expression): Rpn {
  const output: RpnToken[] = [];
  const issues: RpnIssue[] = [];
  const stack: Pending[] = [];
  let expectOperand = true;

  const popInto = (): void => {
    const top = stack.pop()!;
    output.push({ type: 'operator', item: top.item, unary: top.unary });
  };

  for (const item of expression) {
    if (item.kind !== 'operator') {
      if (!expectOperand) {
        issues.push({ blockId: item.id, message: 'Put an operator between this and the value before it.' });
      }
      output.push({ type: 'operand', item });
      expectOperand = false;
      continue;
    }

    const definition = operatorDefinition(item.op);
    const symbol = operatorSymbol(item.op);

    if (expectOperand) {
      if (canBePrefix(item.op)) {
        stack.push({ item, unary: true, precedence: item.op === 'NOT' ? (definition?.precedence ?? 3) : NEGATION_PRECEDENCE });
        continue;
      }
      issues.push({ blockId: item.id, message: `${symbol} needs a value on its left.` });
      output.push({ type: 'missing', operatorId: item.id });
    } else if (definition?.prefixOnly) {
      issues.push({ blockId: item.id, message: `${symbol} goes in front of a value, after AND, OR or an operator.` });
      stack.push({ item, unary: true, precedence: definition.precedence });
      expectOperand = true;
      continue;
    }

    const precedence = definition?.precedence ?? 0;
    const associativity = definition?.associativity ?? 'left';

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.precedence === precedence && associativity === 'none' && !top.unary) {
        issues.push({ blockId: item.id, message: `${symbol} can't follow another comparison directly; combine them with AND or OR.` });
      }
      if (top.precedence > precedence || (top.precedence === precedence && associativity !== 'right')) popInto();
      else break;
    }
    stack.push({ item, unary: false, precedence });
    expectOperand = true;
  }

  if (expectOperand && expression.length > 0) {
    const last: FormulaItem = expression[expression.length - 1];
    issues.push({ blockId: last.id, message: `${operatorSymbol((last as OperatorItem).op)} needs a value after it.` });
    output.push({ type: 'missing', operatorId: last.id });
  }
  while (stack.length > 0) popInto();

  return { tokens: output, issues };
}

/** How to combine RPN tokens into a `T` — a kind, a tree, text. */
export interface RpnFolder<T> {
  operand(item: OperandItem): T;
  missing(operatorId: number | null): T;
  unary(operator: OperatorItem, argument: T): T;
  binary(operator: OperatorItem, left: T, right: T): T;
}

/**
 * Evaluates the token stream on a stack — the reverse Polish way. Returns what is left on the stack:
 * one value for a well-formed expression, more when values sit side by side with no operator between
 * (already reported by {@link toRpn}); the first is the expression's value.
 */
export function foldRpn<T>(tokens: readonly RpnToken[], folder: RpnFolder<T>): T[] {
  const stack: T[] = [];
  for (const token of tokens) {
    if (token.type === 'operand') {
      stack.push(folder.operand(token.item));
    } else if (token.type === 'missing') {
      stack.push(folder.missing(token.operatorId));
    } else if (token.unary) {
      const argument = stack.pop() ?? folder.missing(token.item.id);
      stack.push(folder.unary(token.item, argument));
    } else {
      const right = stack.pop() ?? folder.missing(token.item.id);
      const left = stack.pop() ?? folder.missing(token.item.id);
      stack.push(folder.binary(token.item, left, right));
    }
  }
  return stack;
}
