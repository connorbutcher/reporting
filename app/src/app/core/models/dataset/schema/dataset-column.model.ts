import { DatasetColumnType } from './dataset-column-type.model';
import { DatasetColumnConfiguration } from './dataset-column-configuration.model';

export type DatasetColumn = {
  id: string;
  name: string;
  type: DatasetColumnType;
  order: number;
  /** The formula this column is computed from; absent for an ordinary, editable column. */
  formula?: string | null;
  /** Why the formula cannot currently run (e.g. a column it read was removed); absent when healthy. */
  formulaError?: string | null;
  /** The API always returns a typed config matching {@link type}. */
  configuration: DatasetColumnConfiguration;
};
