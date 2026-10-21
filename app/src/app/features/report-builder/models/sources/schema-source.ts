import { Signal } from '@angular/core';
import { DatasetSchema } from '../../../../core/models/dataset';

/** Look-up of dataset schemas by dataset id, supplied by the store's cache. */
export type SchemaSource = Signal<Record<number, DatasetSchema>>;
