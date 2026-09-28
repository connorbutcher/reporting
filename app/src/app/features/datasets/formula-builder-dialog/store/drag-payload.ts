import { LiteralBlock } from '../model';

/** What is being dragged: something from the palette (which becomes a new item on drop) or an item already on the canvas. */
export type DragPayload =
  | { kind: 'column'; name: string }
  | { kind: 'function'; name: string }
  | { kind: 'operator'; op: string }
  | { kind: 'literal'; value: LiteralBlock['value'] }
  | { kind: 'group' }
  | { kind: 'block'; id: number };
