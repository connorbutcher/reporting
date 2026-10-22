import { Aggregate } from '../chart/aggregate.model';

/** How a pivot measure reduces a group: the chart aggregates, plus a distinct count and a median. */
export type PivotAggregate = Aggregate | 'countDistinct' | 'median';
