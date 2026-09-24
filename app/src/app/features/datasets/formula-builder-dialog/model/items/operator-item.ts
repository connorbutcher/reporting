/** A bare operator symbol. What it applies to is decided by its neighbours in the sequence. */
export interface OperatorItem {
  kind: 'operator';
  id: number;
  /** As the formula language writes it: `+`, `*`, `<>`, `AND`… */
  op: string;
}
