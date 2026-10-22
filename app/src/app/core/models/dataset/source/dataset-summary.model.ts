import { DatasetSourceKey } from './dataset-source-key.model';

export type DatasetSummary = {
  /** The dataset's primary key. Datasets belong to a report revision and are referenced by this id. */
  id: number;
  name: string;
  /** The source system this dataset draws from. */
  source: DatasetSourceKey;
};
