import { DragPayload } from './drag-payload';

/** A drag payload that makes a new item — everything but moving one already on the canvas. */
export type PalettePayload = Exclude<DragPayload, { kind: 'block' }>;
