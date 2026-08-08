import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetData, DatasetRow, DatasetSchema } from '../../../../core/models/dataset.model';
import { ToleranceConfig } from '../../../../core/models/report.model';
import { ReportBuilderStore } from '../../report-builder.store';

/**
 * Associates a numeric column with pass/fail limits: a dataset, one row in it
 * (the active spec), and which of that row's columns hold the min, max, and
 * optional concession bounds. Resolution happens where the table renders —
 * this view only records the pointers.
 */
@Component({
  selector: 'app-panel-column-tolerance',
  imports: [FormsModule, ButtonModule, SelectModule],
  template: `
    @if (column(); as column) {
      <div class="panel-section">
        <p class="panel-hint">
          Values are compared against one row of a limits dataset. Below the
          concession-lower or above the concession-upper bound is red; between a
          concession bound and min/max is orange; inside min/max is unmarked.
        </p>

        <label class="panel-field">
          <span class="panel-field-label">Limits dataset</span>
          <p-select
            [options]="datasets()"
            [ngModel]="sourceDatasetId()"
            optionLabel="name"
            optionValue="id"
            placeholder="Choose a dataset"
            appendTo="body"
            fluid
            showClear
            (onChange)="selectDataset($event.value ?? null)"
          />
        </label>

        @if (sourceDatasetId()) {
          @if (loadingSource()) {
            <p class="panel-empty">Loading…</p>
          } @else {
            <label class="panel-field">
              <span class="panel-field-label">Spec row</span>
              <p-select
                [options]="rowOptions()"
                [ngModel]="sourceRowId()"
                optionLabel="label"
                optionValue="id"
                placeholder="Choose a row"
                appendTo="body"
                fluid
                (onChange)="sourceRowId.set($event.value ?? null)"
              />
            </label>

            <div class="panel-grid-fields">
              <label class="panel-field">
                <span class="panel-field-label">Min</span>
                <p-select
                  [options]="numericColumns()"
                  [ngModel]="minColumnId()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Column"
                  appendTo="body"
                  fluid
                  (onChange)="minColumnId.set($event.value ?? null)"
                />
              </label>
              <label class="panel-field">
                <span class="panel-field-label">Max</span>
                <p-select
                  [options]="numericColumns()"
                  [ngModel]="maxColumnId()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Column"
                  appendTo="body"
                  fluid
                  (onChange)="maxColumnId.set($event.value ?? null)"
                />
              </label>
              <label class="panel-field">
                <span class="panel-field-label">Concession lower</span>
                <p-select
                  [options]="numericColumns()"
                  [ngModel]="concessionLowerColumnId()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="None"
                  appendTo="body"
                  fluid
                  showClear
                  (onChange)="concessionLowerColumnId.set($event.value ?? null)"
                />
              </label>
              <label class="panel-field">
                <span class="panel-field-label">Concession upper</span>
                <p-select
                  [options]="numericColumns()"
                  [ngModel]="concessionUpperColumnId()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="None"
                  appendTo="body"
                  fluid
                  showClear
                  (onChange)="concessionUpperColumnId.set($event.value ?? null)"
                />
              </label>
            </div>

            @if (!isComplete()) {
              <p class="panel-hint">Pick a spec row plus min and max columns to turn on highlighting.</p>
            }
          }
        }

        <p-button
          label="Remove tolerance"
          icon="pi pi-times"
          severity="danger"
          outlined
          fluid
          [disabled]="!column.tolerance()"
          (onClick)="clear()"
        />
      </div>
    } @else {
      <p class="panel-empty">This column is no longer on the table.</p>
    }
  `,
})
export class PanelColumnToleranceComponent {
  private readonly store = inject(ReportBuilderStore);
  private readonly datasetApi = inject(DatasetApiService);

  protected readonly datasets = this.store.datasets;

  private readonly table = this.store.selectedTableWidget;

  private readonly columnId = computed(() => {
    const view = this.store.view();
    return view.kind === 'columnTolerance' ? view.columnId : null;
  });

  protected readonly column = computed(() => {
    const columnId = this.columnId();
    return columnId ? (this.table()?.column(columnId) ?? null) : null;
  });

  // --- draft selection, seeded from the column's saved tolerance -------------

  protected readonly sourceDatasetId = signal<string | null>(null);
  protected readonly sourceRowId = signal<string | null>(null);
  protected readonly minColumnId = signal<string | null>(null);
  protected readonly maxColumnId = signal<string | null>(null);
  protected readonly concessionLowerColumnId = signal<string | null>(null);
  protected readonly concessionUpperColumnId = signal<string | null>(null);

  private readonly sourceSchema = signal<DatasetSchema | null>(null);
  private readonly sourceData = signal<DatasetData | null>(null);
  protected readonly loadingSource = signal(false);

  protected readonly numericColumns = computed(
    () => this.sourceSchema()?.columns.filter((c) => c.type === 'int' || c.type === 'double') ?? [],
  );

  protected readonly rowOptions = computed(() =>
    (this.sourceData()?.rows ?? []).map((row) => ({ id: row.id, label: this.rowLabel(row) })),
  );

  protected readonly isComplete = computed(
    () => !!this.sourceRowId() && !!this.minColumnId() && !!this.maxColumnId(),
  );

  private lastColumnId: string | null = null;

  constructor() {
    // Seeds the draft when the panel opens on a (possibly different) column.
    // Guarded on the id itself, not just presence, so the write-back effect
    // below re-triggering this computed doesn't refetch the source dataset.
    effect(() => {
      const columnId = this.columnId();
      const column = this.column();
      if (!column || columnId === this.lastColumnId) return;
      this.lastColumnId = columnId;

      const tolerance = untracked(() => column.tolerance());
      this.sourceDatasetId.set(tolerance?.sourceDatasetId ?? null);
      this.sourceRowId.set(tolerance?.sourceRowId ?? null);
      this.minColumnId.set(tolerance?.minColumnId ?? null);
      this.maxColumnId.set(tolerance?.maxColumnId ?? null);
      this.concessionLowerColumnId.set(tolerance?.concessionLowerColumnId ?? null);
      this.concessionUpperColumnId.set(tolerance?.concessionUpperColumnId ?? null);
      untracked(() => this.loadSource(tolerance?.sourceDatasetId ?? null));
    });

    // Writes back once the draft is complete; an in-progress edit leaves
    // whatever was last saved untouched rather than persisting a half state.
    effect(() => {
      const sourceDatasetId = this.sourceDatasetId();
      const sourceRowId = this.sourceRowId();
      const minColumnId = this.minColumnId();
      const maxColumnId = this.maxColumnId();
      const concessionLowerColumnId = this.concessionLowerColumnId();
      const concessionUpperColumnId = this.concessionUpperColumnId();

      if (!sourceDatasetId || !sourceRowId || !minColumnId || !maxColumnId) return;

      const tolerance: ToleranceConfig = {
        sourceDatasetId,
        sourceRowId,
        minColumnId,
        maxColumnId,
        ...(concessionLowerColumnId ? { concessionLowerColumnId } : {}),
        ...(concessionUpperColumnId ? { concessionUpperColumnId } : {}),
      };
      untracked(() => this.column()?.setTolerance(tolerance));
    });
  }

  protected selectDataset(datasetId: string | null): void {
    this.sourceDatasetId.set(datasetId);
    this.sourceRowId.set(null);
    this.minColumnId.set(null);
    this.maxColumnId.set(null);
    this.concessionLowerColumnId.set(null);
    this.concessionUpperColumnId.set(null);
    this.loadSource(datasetId);
  }

  protected clear(): void {
    this.selectDataset(null);
    this.column()?.setTolerance(null);
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

  private loadSource(datasetId: string | null): void {
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
