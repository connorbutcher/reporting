import { DatasetSourceConfig, DatasetSourceKey } from './source.model';

export type DatasetColumnType = 'string' | 'int' | 'double' | 'bool' | 'dateTime';

/**
 * The display-configuration shape a column formats through. Several column types
 * share a shape (int and double are both `numeric`), so config is keyed by this
 * kind rather than by the column type directly. Mirrors the API's
 * `DatasetColumnConfigKind` and doubles as the discriminator of the union below.
 */
export type DatasetColumnConfigKind = 'numeric' | 'date' | 'bool' | 'text';

/** Numeric columns (int and double). */
export interface NumericColumnConfig {
  kind: 'numeric';
  /** Fixed number of decimal places; omitted formats up to 3, trimmed of trailing zeros. */
  decimals?: number;
  /** Thousands separators, on by default. */
  useGrouping?: boolean;
  /** Text placed before/after the formatted number. */
  prefix?: string;
  suffix?: string;
}

/** Date/time columns. */
export interface DateColumnConfig {
  kind: 'date';
  /** Angular date pattern, e.g. "dd/MM/yyyy". */
  dateFormat?: string;
}

/** Boolean columns. */
export interface BoolColumnConfig {
  kind: 'bool';
  /** Labels used instead of Yes/No. */
  trueLabel?: string;
  falseLabel?: string;
}

/** Text columns carry no formatting options yet. */
export interface TextColumnConfig {
  kind: 'text';
}

/**
 * A column's typed display configuration, persisted on the dataset column so it
 * applies everywhere the column is used. Discriminated on `kind`; the concrete
 * shape matches the column's {@link DatasetColumnType}.
 */
export type DatasetColumnConfiguration =
  | NumericColumnConfig
  | DateColumnConfig
  | BoolColumnConfig
  | TextColumnConfig;

export interface DatasetColumn {
  id: string;
  name: string;
  type: DatasetColumnType;
  order: number;
  /** The API always returns a typed config matching {@link type}. */
  configuration: DatasetColumnConfiguration;
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
