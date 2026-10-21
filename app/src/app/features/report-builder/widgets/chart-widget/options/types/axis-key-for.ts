import { AxisKey } from './axis-key';

/** Picks which axis an item's marks bind to; a bar's value axis flips with orientation. */
export type AxisKeyFor<T> = (item: T) => AxisKey;
