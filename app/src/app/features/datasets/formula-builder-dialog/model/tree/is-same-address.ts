import { ExpressionAddress } from '../items/expression-address';

export function isSameAddress(a: ExpressionAddress, b: ExpressionAddress): boolean {
  return a.ownerId === b.ownerId && a.arg === b.arg;
}
