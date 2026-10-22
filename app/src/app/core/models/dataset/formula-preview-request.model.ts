import { DatasetColumnType } from './schema.model';

export type FormulaPreviewRequest = {
  expression: string;
  type: DatasetColumnType | null;
  sampleSize: number;
};
