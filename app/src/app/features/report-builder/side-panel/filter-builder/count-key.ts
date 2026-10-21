import { FilterGroup } from '../../../../core/models/filter/index';

export interface CountKey {
  datasetId: number;
  filter: FilterGroup | null;
}
