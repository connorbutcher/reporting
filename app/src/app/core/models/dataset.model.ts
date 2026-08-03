export type DatasetColumnType = 'string' | 'int' | 'double' | 'bool' | 'dateTime';

export interface DatasetSummary {
  id: string;
  name: string;
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
  id: string;
  name: string;
  columns: DatasetColumn[];
}

export interface DatasetRow {
  id: string;
  /** Keyed by column id; every value is stored as a string. */
  values: Record<string, string>;
}

export interface DatasetData {
  id: string;
  name: string;
  rows: DatasetRow[];
}
