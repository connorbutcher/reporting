import { OutlineItemStyle } from '../../marks/types/outline-item-style';
import { Coord } from './coord';

export interface ScatterPoint {
  value: [Coord, Coord];
  tooltipLines: string[];
  /** The bubble size column's raw value for this point; undefined when not bound or not set on this row. */
  size?: number | null;
  /** Per-point override, set only for points outlined as out of tolerance. */
  itemStyle?: OutlineItemStyle;
  /** An outlined point's marker shape, so its status doesn't rest on colour alone. */
  symbol?: 'triangle';
}
