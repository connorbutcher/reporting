import { FilterGroup } from '../../../../core/models/filter';

export type CountKey = {
  datasetId: number;
  filter: FilterGroup | null;
};
