import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DatasetApiService } from '../../../core/api/dataset-api.service';

export interface WidgetDataSourceOptions<T> {
  /** The dataset to load, or null when the widget isn't configured yet. */
  datasetId: Signal<number | null>;
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  version: Signal<number>;
  api: DatasetApiService;
  /**
   * Builds the query for the current config, or returns null when there isn't
   * enough to ask (no dataset, missing axes). Read at fire time, inside the
   * pipeline, so it always sees the latest config.
   */
  fetch: () => Observable<T> | null;
  /** Runs (untracked) each time a dataset's schema is about to load — e.g. to seed sort/page. */
  onSchemaLoad?: () => void;
  /** Long enough that typing a filter value settles into one request. */
  debounceMs?: number;
}
