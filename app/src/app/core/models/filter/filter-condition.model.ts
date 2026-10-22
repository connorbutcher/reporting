import { FilterOperator } from './filter-operator.model';

export type FilterCondition = {
  kind: 'condition';
  columnId: string;
  operator: FilterOperator;
  /** 0, 1 or 2 raw strings, parsed server-side against the column's type. */
  values: string[];
  /** Omitted means enabled, so older filters still apply. A disabled condition is kept but not applied. */
  enabled?: boolean;
};
