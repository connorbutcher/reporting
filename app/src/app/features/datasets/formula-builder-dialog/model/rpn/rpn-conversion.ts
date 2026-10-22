import { Expression } from '../items/expression';
import { Rpn } from './rpn';
import { RpnBuilder } from './rpn-builder';
import { RpnFolder } from './rpn-folder';
import { RpnToken } from './rpn-token';

export class RpnConversion {
  private static readonly CACHE = new WeakMap<Expression, Rpn>();

  /**
   * Converts an expression — the items in the order the user placed them — to reverse Polish notation,
   * using the language's operator precedence and associativity. Because an operator is just a symbol in the
   * sequence, what it applies to is worked out here: `a + b × c` becomes `a b c × +`, and a `-` with nothing
   * before it is a negation.
   *
   * Expressions are immutable, so the result is remembered per expression: an edit rebuilds only the
   * expressions on the path it touched, and every other one is answered from the cache.
   */
  public static of(expression: Expression): Rpn {
    let rpn = RpnConversion.CACHE.get(expression);
    if (!rpn) {
      rpn = new RpnBuilder().build(expression);
      RpnConversion.CACHE.set(expression, rpn);
    }

    return rpn;
  }

  /**
   * Evaluates the token stream on a stack — the reverse Polish way. Returns what is left on the stack:
   * one value for a well-formed expression, more when values sit side by side with no operator between
   * (already reported by `toRpn`); the first is the expression's value.
   */
  public static fold<T>(tokens: readonly RpnToken[], folder: RpnFolder<T>): T[] {
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
}
