import { Expression } from '../items/expression';
import { Rpn } from './rpn';
import { RpnBuilder } from './rpn-builder';

const cache = new WeakMap<Expression, Rpn>();

/**
 * Converts an expression — the items in the order the user placed them — to reverse Polish notation,
 * using the language's operator precedence and associativity. Because an operator is just a symbol in the
 * sequence, what it applies to is worked out here: `a + b × c` becomes `a b c × +`, and a `-` with nothing
 * before it is a negation.
 *
 * Expressions are immutable, so the result is remembered per expression: an edit rebuilds only the
 * expressions on the path it touched, and every other one is answered from the cache.
 */
export function toRpn(expression: Expression): Rpn {
  let rpn = cache.get(expression);
  if (!rpn) {
    rpn = new RpnBuilder().build(expression);
    cache.set(expression, rpn);
  }

  return rpn;
}
