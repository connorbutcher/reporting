import { DatasetColumnType } from './schema.model';

export interface FormulaPreviewRequest {
  expression: string;
  type: DatasetColumnType | null;
  sampleSize: number;
}
