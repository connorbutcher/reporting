/**
 * How several rows in one category collapse to the single number a sort ranks it by. Ignored by
 * a point chart's per-row sort, which has nothing to reduce — each row is its own point.
 */
export type SortAggregate = 'sum' | 'average' | 'count' | 'min' | 'max' | 'median' | 'spread';
