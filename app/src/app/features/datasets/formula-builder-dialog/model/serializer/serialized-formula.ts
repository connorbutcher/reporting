import { BlockSpan } from './block-span';
import { FormulaSegment } from './formula-segment';

export interface SerializedFormula {
  /** The formula as text. Only valid formula text when {@link complete}. */
  text: string;
  segments: FormulaSegment[];
  /** Where each item's text sits in {@link text}, for mapping a server error position back to an item. */
  spans: Map<number, BlockSpan>;
  /** False when something is missing, so {@link text} holds a placeholder and mustn't be sent to the server. */
  complete: boolean;
}
