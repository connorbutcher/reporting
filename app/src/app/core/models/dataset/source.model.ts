/** The source system a dataset draws from. Doubles as the discriminator of its source config. */
export type DatasetSourceKey = 'assembly' | 'disassembly' | 'specification';

/** A selectable dataset source system, for the source pickers. */
export interface DatasetSource {
  id: number;
  key: DatasetSourceKey;
  name: string;
}

/**
 * A dataset's source-specific configuration. Each source system has its own shape and its own
 * editor component (see `dataset-source-configs`), keyed by the `source` discriminator the API
 * round-trips.
 */
export interface AssemblySourceConfig {
  source: 'assembly';
  /** The source-system type id this dataset draws from. Null until chosen. */
  typeId: number | null;
  /** The phases of that type to include, by source-system phase id. */
  phaseIds: number[];
}

export interface DisassemblySourceConfig {
  source: 'disassembly';
  typeId: number | null;
  phaseIds: number[];
}

export interface SpecificationSourceConfig {
  source: 'specification';
}

export type DatasetSourceConfig =
  | AssemblySourceConfig
  | DisassemblySourceConfig
  | SpecificationSourceConfig;

export interface DatasetSummary {
  /** The dataset's primary key. Datasets belong to a report revision and are referenced by this id. */
  id: number;
  name: string;
  /** The source system this dataset draws from. */
  source: DatasetSourceKey;
}
