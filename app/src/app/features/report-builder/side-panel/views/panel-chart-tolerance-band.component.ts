import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { ChartAxis } from '../../../../core/models/report.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { ToleranceSourcePicker } from '../../state/tolerance-source-picker';
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
          Values are compared against one row of a limits dataset and drawn as dashed lines on the
          axis. Concession bounds add a second, lighter pair.
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
              [ngModel]="picker.sourceDatasetId()"
              optionLabel="name"
              optionValue="id"
              placeholder="Choose a dataset"
              appendTo="body"
              fluid
              showClear
              (onChange)="picker.selectDataset($event.value ?? null)"
            />
          </label>

          @if (picker.sourceDatasetId()) {
            @if (picker.loadingSource()) {
              <p class="panel-empty">Loading…</p>
            } @else {
              <label class="panel-field">
                <span class="panel-field-label">Spec row</span>
                <p-select
                  [options]="picker.rowOptions()"
                  [ngModel]="picker.sourceRowId()"
                  optionLabel="label"
                  optionValue="id"
                  placeholder="Choose a row"
                  appendTo="body"
                  fluid
                  (onChange)="picker.sourceRowId.set($event.value ?? null)"
                />
              </label>

              <div class="panel-grid-fields">
                <label class="panel-field">
                  <span class="panel-field-label">Min</span>
                  <p-select
                    [options]="picker.numericColumns()"
                    [ngModel]="picker.minColumnId()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Column"
                    appendTo="body"
                    fluid
                    (onChange)="picker.minColumnId.set($event.value ?? null)"
                  />
                </label>
                <label class="panel-field">
                  <span class="panel-field-label">Max</span>
                  <p-select
                    [options]="picker.numericColumns()"
                    [ngModel]="picker.maxColumnId()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Column"
                    appendTo="body"
                    fluid
                    (onChange)="picker.maxColumnId.set($event.value ?? null)"
                  />
                </label>
                <label class="panel-field">
                  <span class="panel-field-label">Concession lower</span>
                  <p-select
                    [options]="picker.numericColumns()"
                    [ngModel]="picker.concessionLowerColumnId()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="None"
                    appendTo="body"
                    fluid
                    showClear
                    (onChange)="picker.concessionLowerColumnId.set($event.value ?? null)"
                  />
                </label>
                <label class="panel-field">
                  <span class="panel-field-label">Concession upper</span>
                  <p-select
                    [options]="picker.numericColumns()"
                    [ngModel]="picker.concessionUpperColumnId()"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="None"
                    appendTo="body"
                    fluid
                    showClear
                    (onChange)="picker.concessionUpperColumnId.set($event.value ?? null)"
                  />
                </label>
              </div>

              @if (!picker.isComplete()) {
                <p class="panel-hint">
                  Pick a spec row plus min and max columns to draw the lines.
                </p>
              }
            }
          }
        </app-panel-group>

        <p-button
          label="Remove band"
          icon="pi pi-times"
          severity="danger"
          outlined
          fluid
          (onClick)="remove()"
        />
      </div>
    } @else {
      <p class="panel-empty">This band is no longer on the chart.</p>
    }
  `,
})
export class PanelChartToleranceBandComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly datasets = this.store.datasets;
  protected readonly axisOptions = AXIS_OPTIONS;
  protected readonly picker = new ToleranceSourcePicker(inject(DatasetApiService));

  private readonly chart = this.store.selectedChartWidget;

  private readonly bandId = computed(() => {
    const view = this.store.view();
    return view.kind === 'chartToleranceBand' ? view.bandId : null;
  });

  protected readonly band = computed(() => {
    const bandId = this.bandId();
    return bandId ? (this.chart()?.toleranceBand(bandId) ?? null) : null;
  });

  protected readonly axis = signal<ChartAxis>('y');

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
        this.picker.seed(band);
      });
    });

    // Writes back once the draft is complete; an in-progress edit leaves
    // whatever was last saved untouched rather than persisting a half state.
    effect(() => {
      const bandId = this.bandId();
      const axis = this.axis();
      const pointer = this.picker.toPointer();
      if (!bandId || !pointer) return;

      untracked(() => this.chart()?.updateToleranceBand(bandId, { axis, ...pointer }));
    });
  }

  protected remove(): void {
    const bandId = this.bandId();
    if (bandId) this.chart()?.removeToleranceBand(bandId);
    this.store.back();
  }
}
