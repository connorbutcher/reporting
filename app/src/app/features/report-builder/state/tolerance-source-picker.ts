import { computed, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { DatasetData, DatasetRow, DatasetSchema } from '../../../core/models/dataset.model';
import { ToleranceConfig } from '../../../core/models/report.model';

/** The tolerance-pointer fields a saved config or band carries, loosely typed for either shape. */
export interface ToleranceSeed {
  readonly sourceDatasetId?: number | null;
  readonly sourceRowId?: string | null;
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
 */
export class ToleranceSourcePicker {
  readonly sourceDatasetId = signal<number | null>(null);
  readonly sourceRowId = signal<string | null>(null);
  readonly minColumnId = signal<string | null>(null);
  readonly maxColumnId = signal<string | null>(null);
  readonly concessionLowerColumnId = signal<string | null>(null);
  readonly concessionUpperColumnId = signal<string | null>(null);
  readonly loadingSource = signal(false);

  private readonly sourceSchema = signal<DatasetSchema | null>(null);
  private readonly sourceData = signal<DatasetData | null>(null);

  readonly numericColumns = computed(
    () => this.sourceSchema()?.columns.filter((c) => c.type === 'int' || c.type === 'double') ?? [],
  );

  readonly rowOptions = computed(() =>
    (this.sourceData()?.rows ?? []).map((row) => ({ id: row.id, label: this.rowLabel(row) })),
  );

  readonly isComplete = computed(
    () => !!this.sourceRowId() && !!this.minColumnId() && !!this.maxColumnId(),
  );

  constructor(private readonly datasetApi: DatasetApiService) {}

  /** Seeds the draft from a saved pointer (or clears it for none), loading its source dataset. */
  seed(pointer: ToleranceSeed | null): void {
    this.sourceDatasetId.set(pointer?.sourceDatasetId || null);
    this.sourceRowId.set(pointer?.sourceRowId || null);
    this.minColumnId.set(pointer?.minColumnId || null);
    this.maxColumnId.set(pointer?.maxColumnId || null);
    this.concessionLowerColumnId.set(pointer?.concessionLowerColumnId || null);
    this.concessionUpperColumnId.set(pointer?.concessionUpperColumnId || null);
    this.loadSource(pointer?.sourceDatasetId || null);
  }

  /** Swapping dataset invalidates every downstream pick — the old row and columns belong to the old schema. */
  selectDataset(datasetId: number | null): void {
    this.sourceDatasetId.set(datasetId);
    this.sourceRowId.set(null);
    this.minColumnId.set(null);
    this.maxColumnId.set(null);
    this.concessionLowerColumnId.set(null);
    this.concessionUpperColumnId.set(null);
    this.loadSource(datasetId);
  }

  /** The current draft in the shared pointer shape, or null while incomplete. */
  toPointer(): ToleranceConfig | null {
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
    this.datasetApi.getSchema(datasetId).subscribe((schema) => this.sourceSchema.set(schema));
    this.datasetApi.getData(datasetId).subscribe({
      next: (data) => {
        this.sourceData.set(data);
        this.loadingSource.set(false);
      },
      error: () => this.loadingSource.set(false),
    });
  }
}
