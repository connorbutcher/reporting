import { RpnFolder } from './rpn-folder';
import { RpnToken } from './rpn-token';

/**
 * Evaluates the token stream on a stack — the reverse Polish way. Returns what is left on the stack:
 * one value for a well-formed expression, more when values sit side by side with no operator between
 * (already reported by `toRpn`); the first is the expression's value.
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
