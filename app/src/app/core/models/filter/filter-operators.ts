import { FilterOperator } from './filter-operator.model';

export class FilterOperators {
  /** Operators that test a value against its column's tolerance banding: no operand, and only offered on a banded numeric column. */
  public static readonly TOLERANCE: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
    'inTolerance',
    'needsConcession',
    'outOfTolerance',
  ]);
}
