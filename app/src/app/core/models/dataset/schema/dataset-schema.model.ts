import { DatasetSourceConfig } from '../source/dataset-source-config.model';
import { DatasetSourceKey } from '../source/dataset-source-key.model';
import { DatasetColumn } from './dataset-column.model';

export type DatasetSchema = {
  id: number;
  name: string;
  /** The dataset source's primary key, for the source picker. */
  sourceId: number;
  /** The source system this dataset draws from. */
  source: DatasetSourceKey;
  /** The source-specific configuration; its concrete shape matches {@link source}. */
  sourceConfig: DatasetSourceConfig;
  columns: DatasetColumn[];
};
