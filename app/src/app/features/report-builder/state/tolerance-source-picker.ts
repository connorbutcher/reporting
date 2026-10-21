import { Injectable, computed, inject, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetData, DatasetRow, DatasetSchema } from '../../../core/models/dataset';
import { FixedToleranceConfig, ToleranceConfig } from '../../../core/models/report';
import { ToleranceSeed } from './tolerance-seed';
import { ColumnTypes } from '../models/column-types';

/**
 * Edits a tolerance pointer: a limits dataset, a spec row, and which of its columns hold the min,
 * max and concession bounds. Shared by the table column and chart band tolerance panels, each
 * providing its own instance.
 *
 * A table column can instead match a limits row per data row (see {@link matchEnabled}).
 */
@Injectable()
export class ToleranceSourcePicker {
  readonly sourceDatasetId = signal<number | null>(null);
  readonly sourceRowId = signal<string | null>(null);
  readonly minColumnId = signal<string | null>(null);
  readonly maxColumnId = signal<string | null>(null);
  readonly concessionLowerColumnId = signal<string | null>(null);
  readonly concessionUpperColumnId = signal<string | null>(null);
  /** Picks the limits row per data row by matching values. */
  readonly matchEnabled = signal(false);
  /** The table dataset's column whose value picks the limits row. */
  readonly matchColumnId = signal<string | null>(null);
  /** The limits dataset's column holding the same identifiers. */
  readonly sourceMatchColumnId = signal<string | null>(null);
  readonly loadingSource = signal(false);

  private readonly sourceSchema = signal<DatasetSchema | null>(null);
  private readonly sourceData = signal<DatasetData | null>(null);

  readonly numericColumns = computed(
    () => this.sourceSchema()?.columns.filter((c) => ColumnTypes.isNumeric(c.type)) ?? [],
  );

  /** Every limits column; an identifier can be text, a number or a date. */
  readonly sourceColumns = computed(() => this.sourceSchema()?.columns ?? []);

  readonly rowOptions = computed(() =>
    (this.sourceData()?.rows ?? []).map((row) => ({ id: row.id, label: this.rowLabel(row) })),
  );

  readonly isComplete = computed(() => {
    const hasBounds = !!this.minColumnId() && !!this.maxColumnId();
    return this.matchEnabled()
      ? hasBounds && !!this.matchColumnId() && !!this.sourceMatchColumnId()
      : hasBounds && !!this.sourceRowId();
  });

  private readonly datasetApi = inject(DatasetApiService);
  private readonly notify = inject(NotificationService);

  /** Seeds from a saved pointer, or clears for none, loading its dataset. */
  seed(pointer: ToleranceSeed | null): void {
    this.sourceDatasetId.set(pointer?.sourceDatasetId || null);
    this.sourceRowId.set(pointer?.sourceRowId || null);
    this.minColumnId.set(pointer?.minColumnId || null);
    this.maxColumnId.set(pointer?.maxColumnId || null);
    this.concessionLowerColumnId.set(pointer?.concessionLowerColumnId || null);
    this.concessionUpperColumnId.set(pointer?.concessionUpperColumnId || null);
    this.matchEnabled.set(!!pointer?.match);
    this.matchColumnId.set(pointer?.match?.columnId || null);
    this.sourceMatchColumnId.set(pointer?.match?.sourceColumnId || null);
    this.loadSource(pointer?.sourceDatasetId || null);
  }

  /** Clears the row and column picks; the table-side match column and opt-in stay. */
  selectDataset(datasetId: number | null): void {
    this.sourceDatasetId.set(datasetId);
    this.sourceRowId.set(null);
    this.sourceMatchColumnId.set(null);
    this.minColumnId.set(null);
    this.maxColumnId.set(null);
    this.concessionLowerColumnId.set(null);
    this.concessionUpperColumnId.set(null);
    this.loadSource(datasetId);
  }

  /** The fixed-row pointer, or the limits plus match when matching is on. Null while incomplete. */
  toColumnTolerance(): ToleranceConfig | null {
    if (!this.matchEnabled()) return this.toPointer();

    const sourceDatasetId = this.sourceDatasetId();
    const minColumnId = this.minColumnId();
    const maxColumnId = this.maxColumnId();
    const columnId = this.matchColumnId();
    const sourceColumnId = this.sourceMatchColumnId();
    if (!sourceDatasetId || !minColumnId || !maxColumnId || !columnId || !sourceColumnId)
      return null;

    const concessionLowerColumnId = this.concessionLowerColumnId();
    const concessionUpperColumnId = this.concessionUpperColumnId();
    return {
      sourceDatasetId,
      match: { columnId, sourceColumnId },
      minColumnId,
      maxColumnId,
      ...(concessionLowerColumnId ? { concessionLowerColumnId } : {}),
      ...(concessionUpperColumnId ? { concessionUpperColumnId } : {}),
    };
  }

  /** The fixed-row pointer a chart band uses; null while incomplete. */
  toPointer(): FixedToleranceConfig | null {
    const sourceDatasetId = this.sourceDatasetId();
    const sourceRowId = this.sourceRowId();
    const minColumnId = this.minColumnId();
    const maxColumnId = this.maxColumnId();
    if (!sourceDatasetId || !sourceRowId || !minColumnId || !maxColumnId) return null;

    const concessionLowerColumnId = this.concessionLowerColumnId();
    const concessionUpperColumnId = this.concessionUpperColumnId();
    return {
      sourceDatasetId,
      sourceRowId,
      minColumnId,
      maxColumnId,
      ...(concessionLowerColumnId ? { concessionLowerColumnId } : {}),
      ...(concessionUpperColumnId ? { concessionUpperColumnId } : {}),
    };
  }

  /** Up to the row's first three values. */
  private rowLabel(row: DatasetRow): string {
    const columns = this.sourceSchema()?.columns.slice(0, 3) ?? [];
    const label = columns
      .map((c) => row.values[c.id])
      .filter((v) => !!v)
      .join(' · ');
    return label || 'Row';
  }

  private loadSource(datasetId: number | null): void {
    this.sourceSchema.set(null);
    this.sourceData.set(null);
    if (!datasetId) return;

    this.loadingSource.set(true);
    this.datasetApi.getSchema(datasetId).subscribe({
      next: (schema) => this.sourceSchema.set(schema),
      error: (err) =>
        this.notify.loadError(err, "Couldn't load the limits dataset's columns. Please try again."),
    });
    this.datasetApi.getData(datasetId).subscribe({
      next: (data) => {
        this.sourceData.set(data);
        this.loadingSource.set(false);
      },
      error: (err) => {
        this.loadingSource.set(false);
        this.notify.loadError(err, "Couldn't load the limits dataset's rows. Please try again.");
      },
    });
  }
}
