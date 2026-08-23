import { DatasetSourceConfig, DatasetSourceKey } from './source.model';

export type DatasetColumnType = 'string' | 'int' | 'double' | 'bool' | 'dateTime';

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
