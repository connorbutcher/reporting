import { DatasetColumnType } from '../../../../core/models/dataset';

/** A formula worth asking the server about. */
export type PreviewRequest = {
  text: string;
  type: DatasetColumnType | null;
};
