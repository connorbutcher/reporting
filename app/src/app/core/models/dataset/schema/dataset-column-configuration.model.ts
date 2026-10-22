import { NumericColumnConfig } from './numeric-column-config.model';
import { DateColumnConfig } from './date-column-config.model';
import { BoolColumnConfig } from './bool-column-config.model';
import { TextColumnConfig } from './text-column-config.model';

/**
 * A column's typed display configuration, persisted on the dataset column so it
 * applies everywhere the column is used. Discriminated on `kind`; the concrete
 * shape matches the column's {@link DatasetColumnType}.
 */
export type DatasetColumnConfiguration =
  NumericColumnConfig | DateColumnConfig | BoolColumnConfig | TextColumnConfig;
