import { DatasetColumn, DatasetSchema } from '../../../../../core/models/dataset';
import { OperatorCatalogue } from '../../../../../core/models/filter';

export interface ContextOptions {
  columns?: DatasetColumn[];
  /** Null leaves the schema pending. */
  schema?: DatasetSchema | null;
  catalogue?: OperatorCatalogue | null;
  scope?: DatasetColumn[];
  tolerant?: string[];
  widgetId?: string;
}
