export type DatasetColumnType = 'string' | 'int' | 'double' | 'bool' | 'dateTime';

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

/**
 * Free-form per-column display settings persisted on the dataset column.
 * Every key is optional; only the ones meaningful for the column's type apply.
 */
export interface DatasetColumnConfiguration {
  /** Numeric: fixed number of decimal places. */
  decimals?: number;
  /** Numeric: thousands separators, on by default. */
  useGrouping?: boolean;
  /** Numeric: text placed before/after the formatted number. */
  prefix?: string;
  suffix?: string;
  /** Date: Angular date pattern, e.g. "dd/MM/yyyy". */
  dateFormat?: string;
  /** Bool: labels used instead of Yes/No. */
  trueLabel?: string;
  falseLabel?: string;
}

export interface DatasetColumn {
  id: string;
  name: string;
  type: DatasetColumnType;
  order: number;
  configuration: DatasetColumnConfiguration | null;
}

export interface DatasetSchema {
  id: number;
  name: string;
  /** The dataset source's primary key, for the source picker. */
  sourceId: number;
  /** The source system this dataset draws from. */
  source: DatasetSourceKey;
  /** The source-specific configuration; its concrete shape matches {@link source}. */
  sourceConfig: DatasetSourceConfig;
  columns: DatasetColumn[];
}

export interface DatasetRow {
  id: string;
  /** Keyed by column id; every value is stored as a string. */
  values: Record<string, string>;
}

export interface DatasetData {
  id: number;
  name: string;
  rows: DatasetRow[];
}

/**
 * A contiguous window of a dataset's rows for the editor grid's lazy virtual
 * scroll: {@link rows} is the slice at the requested offset, {@link total} the
 * full row count so the grid can size its scrollbar without loading every row.
 */
export interface DatasetRowWindow {
  total: number;
  rows: DatasetRow[];
}
