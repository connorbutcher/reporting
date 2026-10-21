import { FilterCondition, FilterGroup, FilterNode } from '../../../../core/models/filter';
import { FilterConditionModel } from './filter-condition.model';
import { FilterContext } from './filter-context';

/** Converts stored filter trees into condition models. */
export class FilterGroupNodes {
  /**
   * The UI offers one level of grouping, so a stored filter's nested groups are flattened to their
   * conditions rather than dropped. `clone` deep-copies each first, for a filter also held elsewhere.
   */
  public static toConditionModels(
    dto: FilterGroup | null,
    context: FilterContext,
    options?: { clone?: boolean },
  ): FilterConditionModel[] {
    return (dto?.children ?? [])
      .flatMap(FilterGroupNodes.flattenConditions)
      .map((c) => new FilterConditionModel(options?.clone ? structuredClone(c) : c, context));
  }

  private static flattenConditions(node: FilterNode): FilterCondition[] {
    return node.kind === 'condition'
      ? [node]
      : node.children.flatMap(FilterGroupNodes.flattenConditions);
  }
}
