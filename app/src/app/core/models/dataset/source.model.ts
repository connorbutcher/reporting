import { FilterGroup } from '../filter/filter.model';

/** The source system a dataset draws from. Doubles as the discriminator of its source config. */
export type DatasetSourceKey = 'assembly' | 'disassembly' | 'specification' | 'filtered';

/** A selectable dataset source system, for the source pickers. */
export type DatasetSource = {
  id: number;
  key: DatasetSourceKey;
  name: string;
};

/**
 * A dataset's source-specific configuration. Each source system has its own shape and its own
 * editor component (see `dataset-source-configs`), keyed by the `source` discriminator the API
 * round-trips.
 */
export type AssemblySourceConfig = {
  source: 'assembly';
  /** The source-system type id this dataset draws from. Null until chosen. */
  typeId: number | null;
  /** The phases of that type to include, by source-system phase id. */
  phaseIds: number[];
};

export type DisassemblySourceConfig = {
  source: 'disassembly';
  typeId: number | null;
  phaseIds: number[];
};

export type SpecificationSourceConfig = {
  source: 'specification';
};

/** Configuration for a filtered dataset: the dataset it draws rows from, plus the saved filter. */
export type FilteredSourceConfig = {
  source: 'filtered';
  /** The dataset (in the same report) this one filters. Null until chosen. */
  baseDatasetId: number | null;
  /** The saved filter, referencing the base dataset's columns. Null (or empty) filters nothing. */
  filter: FilterGroup | null;
};

export type DatasetSourceConfig =
  AssemblySourceConfig | DisassemblySourceConfig | SpecificationSourceConfig | FilteredSourceConfig;

export type DatasetSummary = {
  /** The dataset's primary key. Datasets belong to a report revision and are referenced by this id. */
  id: number;
  name: string;
  /** The source system this dataset draws from. */
  source: DatasetSourceKey;
};
