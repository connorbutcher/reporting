import { FilterGroup } from './filter-group.model';

/** Applies to every widget bound to the dataset. */
export type ReportFilter = {
  datasetId: number;
  filter: FilterGroup;
};
