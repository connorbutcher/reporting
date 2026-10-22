import { NumericColumnConfig } from './numeric-column-config.model';
import { DateColumnConfig } from './date-column-config.model';
import { BoolColumnConfig } from './bool-column-config.model';
import { TextColumnConfig } from './text-column-config.model';

/** A column's display configuration, applied wherever the column is used. Discriminated on `kind`. */
export type DatasetColumnConfiguration =
  NumericColumnConfig | DateColumnConfig | BoolColumnConfig | TextColumnConfig;
