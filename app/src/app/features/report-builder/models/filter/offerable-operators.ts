import {
  FilterOperator,
  OperatorDescriptor,
  FilterOperators,
} from '../../../../core/models/filter';

export class OfferableOperators {
  /**
   * Tolerance operators need a band (elsewhere they match nothing), but the selected one stays so its
   * row doesn't go blank.
   */
  public static of(
    all: readonly OperatorDescriptor[],
    hasBanding: boolean,
    current: FilterOperator,
  ): OperatorDescriptor[] {
    if (hasBanding) {
      return [...all];
    }
    return all.filter((o) => !FilterOperators.TOLERANCE.has(o.value) || o.value === current);
  }
}
