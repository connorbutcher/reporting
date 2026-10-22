import { DatasetRow } from './dataset-row.model';

export type DatasetData = {
  id: number;
  name: string;
  rows: DatasetRow[];
};
