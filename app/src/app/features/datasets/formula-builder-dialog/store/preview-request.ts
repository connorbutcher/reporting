import { DatasetColumnType } from '../../../../core/models/dataset';

/** A formula worth asking the server about. */
export interface PreviewRequest {
  text: string;
  type: DatasetColumnType | null;
}
