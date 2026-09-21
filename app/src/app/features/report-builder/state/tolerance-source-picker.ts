import { Injectable, computed, inject, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DatasetData, DatasetRow, DatasetSchema } from '../../../core/models/dataset';
import { FixedToleranceConfig, ToleranceConfig, ToleranceMatch } from '../../../core/models/report';

/** The tolerance-pointer fields a saved config or band carries, loosely typed for either shape. */
export interface ToleranceSeed {
  readonly sourceDatasetId?: number | null;
  readonly sourceRowId?: string | null;
  /** Only a table column's tolerance can match per row; a chart band never carries this. */
  readonly match?: ToleranceMatch | null;
  readonly minColumnId?: string | null;
  readonly maxColumnId?: string | null;
  readonly concessionLowerColumnId?: string | null;
  readonly concessionUpperColumnId?: string | null;
}

/**
 * Picks a limits dataset, a spec row in it, and which of that row's columns
 * hold the min, max, and optional concession bounds — the "point at a spec
 * row" sub-widget shared by a table column's tolerance panel and a chart's
 * tolerance-band panel. Resolution of the actual bounds happens where the
 * widget renders; this only records and edits the pointers.
 *
 * A table column can also opt in to matching (see {@link matchEnabled}): instead of one fixed
 * spec row, each data row's limits row is the one whose value in a chosen column equals the
 * data row's value in another. A chart band never does, so it never turns that on.
 *
 * Provided per-panel (in each tolerance panel's `providers`) so every panel
 * instance gets its own picker state, and injected there rather than the panel
 * reaching for the dataset API itself.
 */
@Injectable()
export class ToleranceSourcePicker {
  readonly sourceDatasetId = signal<number | null>(null);
  readonly sourceRowId = signal<string | null>(null);
  readonly minColumnId = signal<string | null>(null);
  readonly maxColumnId = signal<string | null>(null);
  readonly concessionLowerColumnId = signal<string | null>(null);
  readonly concessionUpperColumnId = signal<string | null>(null);
  /** The reader opted in to choosing the limits row per data row, by matching values. */
  readonly matchEnabled = signal(false);
  /** The column of the table's own dataset whose value picks the limits row. */
  readonly matchColumnId = signal<string | null>(null);
  /** The column of the limits dataset that holds the same identifiers. */
  readonly sourceMatchColumnId = signal<string | null>(null);
  readonly loadingSource = signal(false);

  private readonly sourceSchema = signal<DatasetSchema | null>(null);
  private readonly sourceData = signal<DatasetData | null>(null);

  readonly numericColumns = computed(
    () => this.sourceSchema()?.columns.filter((c) => c.type === 'int' || c.type === 'double') ?? [],
  );

  /** Every column of the limits dataset — an identifier can be text, a number or a date. */
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

  /** Seeds the draft from a saved pointer (or clears it for none), loading its source dataset. */
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

  /**
   * Swapping dataset invalidates every downstream pick — the old row and columns belong to the old
   * schema. The table-side match column and the opt-in itself belong to the table, so they stay.
   */
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

  /**
   * The draft as a table column's tolerance: the fixed-row pointer, or — when matching is on — the
   * limits plus the match (with no fixed row). Null while incomplete.
   */
  toColumnTolerance(): ToleranceConfig | null {
    if (!this.matchEnabled()) return this.toPointer();

    const sourceDatasetId = this.sourceDatasetId();
    const minColumnId = this.minColumnId();
    const maxColumnId = this.maxColumnId();
    const columnId = this.matchColumnId();
    const sourceColumnId = this.sourceMatchColumnId();
    if (!sourceDatasetId || !minColumnId || !maxColumnId || !columnId || !sourceColumnId) return null;

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

  /** The current draft as a fixed-row pointer (the shape a chart band also uses), or null while incomplete. */
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

  /** A human label for a spec row, from up to its first three column values. */
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
