import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DatasetApiService } from '../../../core/api/dataset-api.service';

export interface WidgetDataSourceOptions<T> {
  datasetId: Signal<number | null>;
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  version: Signal<number>;
  api: DatasetApiService;
  /** The query for the current config, or null when too little is bound. Read at fire time. */
  fetch: () => Observable<T> | null;
  /** Runs untracked before each schema load, e.g. to seed sort and page. */
  onSchemaLoad?: () => void;
  debounceMs?: number;
}
