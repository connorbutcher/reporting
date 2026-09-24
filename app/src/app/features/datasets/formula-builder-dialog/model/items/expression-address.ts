/** Which expression an item lives in: the formula's root, or an argument of a function (a group's body is argument 0). */
export interface ExpressionAddress {
  /** null for the root expression. */
  ownerId: number | null;
  arg: number;
}
