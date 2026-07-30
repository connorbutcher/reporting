export type FieldDataType = 'string' | 'int' | 'double' | 'bool' | 'dateTime';

export interface DatasetSummary {
  id: string;
  name: string;
}

export interface DatasetFieldSchema {
  displayName: string;
  dataType: FieldDataType;
}

export interface DatasetSchema {
  id: string;
  name: string;
  fields: DatasetFieldSchema[];
}

export interface DatasetField {
  id: string;
  displayName: string;
  dataType: FieldDataType;
  value: string | number | boolean | null;
}

export interface DatasetRecord {
  id: string;
  fields: DatasetField[];
}

export interface DatasetData {
  id: string;
  name: string;
  records: DatasetRecord[];
}
