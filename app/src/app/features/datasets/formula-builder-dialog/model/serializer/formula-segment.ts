import { SegmentStyle } from './segment-style';

/** A run of formula text and the item it belongs to, for the readable, highlighted view. */
export interface FormulaSegment {
  text: string;
  style: SegmentStyle;
  /** The item this text stands for; a missing value carries the item it should have been beside (or its function). */
  blockId: number | null;
}
