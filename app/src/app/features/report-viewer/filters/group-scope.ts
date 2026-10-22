import { Signal } from '@angular/core';
import { DatasetColumn } from '../../../core/models/dataset';

/** The columns an entry's filter may use, and which of them offer tolerance operators. */
export type GroupScope = {
  columns?: Signal<DatasetColumn[]>;
  tolerantColumns: Signal<ReadonlySet<string>>;
};
