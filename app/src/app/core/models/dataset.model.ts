export type DatasetColumnType = 'string' | 'int' | 'double' | 'bool' | 'dateTime';

export interface DatasetSummary {
  id: string;
  name: string;
}

export interface DatasetColumn {
  id: string;
  name: string;
  type: DatasetColumnType;
  order: number;
  configuration: Record<string, unknown> | null;
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
