import {
  FilterOperator,
  OperatorDescriptor,
  TOLERANCE_OPERATORS,
} from '../../../../core/models/filter';

/** Decides which operators a filter condition may offer. */
export class OfferableOperators {
  /**
   * A type's operators as a condition may offer them. Tolerance operators need a band to test against
   * (elsewhere they'd silently match nothing), but a currently selected one stays so its row doesn't go blank.
   */
  public static of(
    all: readonly OperatorDescriptor[],
    hasBanding: boolean,
    current: FilterOperator,
  ): OperatorDescriptor[] {
    if (hasBanding) return [...all];
    return all.filter((o) => !TOLERANCE_OPERATORS.has(o.value) || o.value === current);
  }
}
