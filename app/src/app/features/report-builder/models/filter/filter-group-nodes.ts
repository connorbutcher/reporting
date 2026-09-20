import { FilterCondition, FilterGroup, FilterNode } from '../../../../core/models/filter';
import { FilterConditionModel } from './filter-condition.model';
import { FilterContext } from './filter-context';

/**
 * The UI offers one level of grouping, so a stored filter's nested groups are flattened to their
 * conditions rather than dropped. `clone` deep-copies each first, for a filter also held elsewhere.
 */
export function toConditionModels(
  dto: FilterGroup | null,
  context: FilterContext,
  options?: { clone?: boolean },
): FilterConditionModel[] {
  return (dto?.children ?? [])
    .flatMap(flattenConditions)
    .map((c) => new FilterConditionModel(options?.clone ? structuredClone(c) : c, context));
}

function flattenConditions(node: FilterNode): FilterCondition[] {
  return node.kind === 'condition' ? [node] : node.children.flatMap(flattenConditions);
}
