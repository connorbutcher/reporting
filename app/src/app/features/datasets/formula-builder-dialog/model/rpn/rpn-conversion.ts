import { Expression } from '../items/expression';
import { Rpn } from './rpn';
import { RpnBuilder } from './rpn-builder';
import { RpnFolder } from './rpn-folder';
import { RpnToken } from './rpn-token';

export class RpnConversion {
  private static readonly CACHE = new WeakMap<Expression, Rpn>();

  /**
   * Converts an expression to RPN by precedence and associativity. Cached per immutable expression,
   * so an edit only rebuilds the path it touched.
   */
  public static of(expression: Expression): Rpn {
    let rpn = RpnConversion.CACHE.get(expression);
    if (!rpn) {
      rpn = new RpnBuilder().build(expression);
      RpnConversion.CACHE.set(expression, rpn);
    }

    return rpn;
  }

  /** Evaluates the tokens on a stack; more than one result means values with no operator between. */
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
