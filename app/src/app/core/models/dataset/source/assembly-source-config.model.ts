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
