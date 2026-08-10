import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { DatasetData, DatasetRow, DatasetSchema } from '../../../../core/models/dataset.model';
import { ChartAxis } from '../../../../core/models/report.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

const AXIS_OPTIONS: { label: string; value: ChartAxis }[] = [
  { label: 'Y axis', value: 'y' },
  { label: 'X axis', value: 'x' },
];

/**
 * One dashed reference-line pair (min/max, optionally concession bounds) for
 * a chart, resolved against one row of a separate limits dataset — the chart
 * equivalent of a table column's tolerance. A chart can hold several bands.
 */
@Component({
  selector: 'app-panel-chart-tolerance-band',
  imports: [FormsModule, ButtonModule, SelectModule, SelectButtonModule, PanelGroupComponent],
  template: `
    @if (band(); as band) {
      <div class="panel-section">
        <p class="panel-hint">
          Values are compared against one row of a limits dataset and drawn as
          dashed lines on the axis. Concession bounds add a second, lighter pair.
        </p>

        <app-panel-group label="Axis" icon="＋">
          <label class="panel-field">
            <span class="panel-field-label">Plot against</span>
            <p-selectbutton
              [options]="axisOptions"
              [ngModel]="axis()"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
              (ngModelChange)="axis.set($event)"
            />
          </label>
        </app-panel-group>

        <app-panel-group label="Limits" icon="⛁">
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
                <p class="panel-hint">Pick a spec row plus min and max columns to draw the lines.</p>
              }
            }
          }
        </app-panel-group>

        <p-button label="Remove band" icon="pi pi-times" severity="danger" outlined fluid (onClick)="remove()" />
      </div>
    } @else {
      <p class="panel-empty">This band is no longer on the chart.</p>
    }
  `,
})
export class PanelChartToleranceBandComponent {
  private readonly store = inject(ReportBuilderStore);
  private readonly datasetApi = inject(DatasetApiService);

  protected readonly datasets = this.store.datasets;
  protected readonly axisOptions = AXIS_OPTIONS;

  private readonly chart = this.store.selectedChartWidget;

  private readonly bandId = computed(() => {
    const view = this.store.view();
    return view.kind === 'chartToleranceBand' ? view.bandId : null;
  });

  protected readonly band = computed(() => {
    const bandId = this.bandId();
    return bandId ? (this.chart()?.toleranceBand(bandId) ?? null) : null;
  });

  // --- draft selection, seeded from the band's saved config -------------

  protected readonly axis = signal<ChartAxis>('y');
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

  private lastBandId: string | null = null;

  constructor() {
    // Seeds the draft when the panel opens on a (possibly different) band.
    // Guarded on the id itself, not just presence, so the write-back effect
    // below re-triggering this computed doesn't refetch the source dataset.
    effect(() => {
      const bandId = this.bandId();
      const band = this.band();
      if (!band || bandId === this.lastBandId) return;
      this.lastBandId = bandId;

      untracked(() => {
        this.axis.set(band.axis);
        this.sourceDatasetId.set(band.sourceDatasetId || null);
        this.sourceRowId.set(band.sourceRowId || null);
        this.minColumnId.set(band.minColumnId || null);
        this.maxColumnId.set(band.maxColumnId || null);
        this.concessionLowerColumnId.set(band.concessionLowerColumnId ?? null);
        this.concessionUpperColumnId.set(band.concessionUpperColumnId ?? null);
        this.loadSource(band.sourceDatasetId || null);
      });
    });

    // Writes back once the draft is complete; an in-progress edit leaves
    // whatever was last saved untouched rather than persisting a half state.
    effect(() => {
      const bandId = this.bandId();
      const axis = this.axis();
      const sourceDatasetId = this.sourceDatasetId();
      const sourceRowId = this.sourceRowId();
      const minColumnId = this.minColumnId();
      const maxColumnId = this.maxColumnId();
      const concessionLowerColumnId = this.concessionLowerColumnId();
      const concessionUpperColumnId = this.concessionUpperColumnId();

      if (!bandId || !sourceDatasetId || !sourceRowId || !minColumnId || !maxColumnId) return;

      untracked(() =>
        this.chart()?.updateToleranceBand(bandId, {
          axis,
          sourceDatasetId,
          sourceRowId,
          minColumnId,
          maxColumnId,
          concessionLowerColumnId: concessionLowerColumnId ?? undefined,
          concessionUpperColumnId: concessionUpperColumnId ?? undefined,
        }),
      );
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

  protected remove(): void {
    const bandId = this.bandId();
    if (bandId) this.chart()?.removeToleranceBand(bandId);
    this.store.back();
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
