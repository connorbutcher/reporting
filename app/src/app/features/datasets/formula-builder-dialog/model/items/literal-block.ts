export interface LiteralBlock {
  kind: 'literal';
  id: number;
  /** null is the blank literal, NULL. */
  value: number | string | boolean | null;
}
