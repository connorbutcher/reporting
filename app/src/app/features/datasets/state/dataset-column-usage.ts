import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import {
  ColumnTypeImpact,
  ColumnUse,
  DatasetColumnType,
  DatasetColumnUsage as DatasetColumnUsageResponse,
} from '../../../core/models/dataset';
import { skipHttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { DatasetCollection } from './dataset-collection';

/**
 * Where the selected dataset's columns are used across its report's draft — the widgets and page
 * filters that removing a column would leave broken. Refetched whenever the selection changes.
 *
 * A failure is not surfaced as a toast: the answer is advisory, so the columns panel simply says it
 * couldn't check, and deleting stays possible (with that caveat in its confirmation).
 */
@Injectable()
export class DatasetColumnUsage {
  private readonly collection = inject(DatasetCollection);
  private readonly api = inject(DatasetApiService);

  private readonly resource = httpResource<DatasetColumnUsageResponse>(() => {
    const id = this.collection.selectedId();
    return id ? { url: `/api/datasets/${id}/column-usage`, context: skipHttpErrorNotification() } : undefined;
  });

  private readonly byColumn = computed(
    () =>
      new Map(
        (this.resource.hasValue() ? this.resource.value().columns : []).map((c) => [c.columnId, c.uses]),
      ),
  );

  /** True once the selected dataset's usage has loaded, so an empty answer means "unused", not "not asked yet". */
  public readonly known = computed(() => this.resource.hasValue());

  /** True when the usage couldn't be loaded. */
  public readonly failed = computed(() => !!this.resource.error());

  /**
   * What changing a column's type would newly break in the report; null when no dataset is selected.
   * Asked at the moment of the change rather than held, since it depends on the type chosen.
   */
  public typeChangeImpact(columnId: string, type: DatasetColumnType): Observable<ColumnTypeImpact> | null {
    const id = this.collection.selectedId();
    return id ? this.api.columnTypeImpact(id, columnId, type) : null;
  }

  /** Every use of one column, in tab and widget order; empty when it isn't used (or the usage isn't known yet). */
  public usesOf(columnId: string): readonly ColumnUse[] {
    return this.byColumn().get(columnId) ?? [];
  }
}
