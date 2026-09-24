import { ParentContext } from './parent-context';

/**
 * Whether a child with this precedence needs brackets under its parent. Equal precedence needs them on the
 * side the operator doesn't group towards — and on both sides for a comparison, which can't be chained.
 */
export function needsBrackets(precedence: number, parent: ParentContext): boolean {
  if (precedence !== parent.precedence) {
    return precedence < parent.precedence;
  }

  if (parent.associativity === 'none') {
    return true;
  }

  return parent.associativity === 'left' ? parent.side === 'right' : parent.side === 'left';
}
