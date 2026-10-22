import { FilterJoin } from './filter-join.model';
import { FilterNode } from './filter-node.model';

export type FilterGroup = {
  kind: 'group';
  join: FilterJoin;
  children: FilterNode[];
};
