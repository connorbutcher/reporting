import { DatasetColumnType } from '../schema/dataset-column-type.model';

export type FormulaPreviewRequest = {
  expression: string;
  type: DatasetColumnType | null;
  sampleSize: number;
};
