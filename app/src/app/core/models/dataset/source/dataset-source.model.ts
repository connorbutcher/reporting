import { DatasetSourceKey } from './dataset-source-key.model';

/** A selectable dataset source system, for the source pickers. */
export type DatasetSource = {
  id: number;
  key: DatasetSourceKey;
  name: string;
};
