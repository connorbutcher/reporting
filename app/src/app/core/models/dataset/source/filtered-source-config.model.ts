import { FilterGroup } from '../../filter/filter-group.model';

/** Configuration for a filtered dataset: the dataset it draws rows from, plus the saved filter. */
export type FilteredSourceConfig = {
  source: 'filtered';
  /** The dataset (in the same report) this one filters. Null until chosen. */
  baseDatasetId: number | null;
  /** The saved filter, referencing the base dataset's columns. Null (or empty) filters nothing. */
  filter: FilterGroup | null;
};
