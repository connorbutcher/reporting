/** Source-specific configuration, discriminated on `source`. */
export type AssemblySourceConfig = {
  source: 'assembly';
  /** The source-system type id this dataset draws from. Null until chosen. */
  typeId: number | null;
  /** The phases of that type to include, by source-system phase id. */
  phaseIds: number[];
};
