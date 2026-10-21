import { FilterGroup } from '../../../../core/models/filter';

export interface CountKey {
  datasetId: number;
  filter: FilterGroup | null;
}
