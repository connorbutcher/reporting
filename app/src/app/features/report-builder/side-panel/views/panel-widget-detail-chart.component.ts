import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ChartToleranceBand } from '../../../../core/models/report.model';
import { ChartWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

/** The chart branch of the widget-detail panel: dataset, axes, series, appearance, tolerance bands, and tooltip. */
@Component({
  selector: 'app-panel-widget-detail-chart',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
  ],
  template: `
    <app-panel-group label="Data source" icon="⛁">
      <label class="panel-field">
        <span class="panel-field-label">Dataset</span>
        <p-select
          [options]="store.datasets()"
          [ngModel]="chart().datasetId()"
          optionLabel="name"
          optionValue="id"
          placeholder="Select a dataset"
          appendTo="body"
          [showClear]="true"
          fluid
          (onChange)="chart().setDataset($event.value ?? null)"
        />
      </label>
    </app-panel-group>

    <app-panel-group label="Axes" icon="＋">
      <div class="panel-grid-fields">
        <label class="panel-field">
          <span class="panel-field-label">X axis</span>
          <p-select
            [options]="chart().numericColumns()"
            [ngModel]="chart().xColumnId()"
            optionLabel="name"
            optionValue="id"
            placeholder="Column"
            appendTo="body"
            [disabled]="!chart().datasetId()"
            fluid
            (onChange)="chart().xColumnId.set($event.value ?? null)"
          />
        </label>
        <label class="panel-field">
          <span class="panel-field-label">Y axis</span>
          <p-select
            [options]="chart().numericColumns()"
            [ngModel]="chart().yColumnId()"
            optionLabel="name"
            optionValue="id"
            placeholder="Column"
            appendTo="body"
            [disabled]="!chart().datasetId()"
            fluid
            (onChange)="chart().yColumnId.set($event.value ?? null)"
          />
        </label>
      </div>
    </app-panel-group>

    <app-panel-group label="Series" icon="◐">
      <label class="panel-field">
        <span class="panel-field-label">Colour by (optional)</span>
        <p-select
          [options]="chart().schema()?.columns ?? []"
          [ngModel]="chart().seriesColumnId()"
          optionLabel="name"
          optionValue="id"
          placeholder="One series"
          appendTo="body"
          [showClear]="true"
          [disabled]="!chart().datasetId()"
          fluid
          (onChange)="chart().seriesColumnId.set($event.value ?? null)"
        />
      </label>
    </app-panel-group>

    <app-panel-group label="Appearance" icon="▤">
      <div class="panel-grid-fields">
        <label class="panel-field">
          <span class="panel-field-label">X axis label</span>
          <input
            pInputText
            [ngModel]="chart().xAxisLabel()"
            (ngModelChange)="chart().xAxisLabel.set($event)"
            [placeholder]="axisPlaceholder(chart().xColumnId())"
          />
        </label>
        <label class="panel-field">
          <span class="panel-field-label">Y axis label</span>
          <input
            pInputText
            [ngModel]="chart().yAxisLabel()"
            (ngModelChange)="chart().yAxisLabel.set($event)"
            [placeholder]="axisPlaceholder(chart().yColumnId())"
          />
        </label>
      </div>

      <label class="panel-field">
        <span class="panel-field-label">Point size (px)</span>
        <p-inputnumber
          [ngModel]="chart().pointSize()"
          (ngModelChange)="chart().pointSize.set($event ?? 8)"
          [min]="2"
          [max]="40"
          fluid
        />
      </label>

      <div class="panel-inline-field">
        <p-checkbox
          [binary]="true"
          inputId="chart-legend"
          [ngModel]="chart().showLegend()"
          (onChange)="chart().showLegend.set($event.checked)"
        />
        <label for="chart-legend">Show legend</label>
      </div>
    </app-panel-group>

    <button
      type="button"
      class="panel-menu-item"
      [disabled]="!chart().datasetId()"
      (click)="store.navigate({ kind: 'widgetFilters', widgetId: chart().id })"
    >
      <i class="pi pi-filter" aria-hidden="true"></i>
      <span class="panel-menu-text">
        <span class="panel-menu-label">Filters</span>
        <span class="panel-menu-hint">
          {{
            !chart().datasetId()
              ? 'Pick a dataset first'
              : chart().filter.count() === 0
                ? 'Showing every point'
                : chart().filter.count() + ' condition' + (chart().filter.count() > 1 ? 's' : '')
          }}
        </span>
      </span>
      <i class="pi pi-angle-right" aria-hidden="true"></i>
    </button>

    <app-panel-group label="Tolerance bands" icon="⛁">
      <p class="panel-hint">Dashed reference lines resolved from a separate limits dataset.</p>
      @if (chart().toleranceBands().length === 0) {
        <p class="panel-empty">No reference lines yet.</p>
      } @else {
        @for (band of chart().toleranceBands(); track band.id) {
          <button
            type="button"
            class="panel-menu-item"
            (click)="store.navigate({ kind: 'chartToleranceBand', widgetId: chart().id, bandId: band.id })"
          >
            <i class="pi pi-minus" aria-hidden="true"></i>
            <span class="panel-menu-text">
              <span class="panel-menu-label">{{ band.axis === 'x' ? 'X axis' : 'Y axis' }}</span>
              <span class="panel-menu-hint">{{ bandSummary(band) }}</span>
            </span>
            <i class="pi pi-angle-right" aria-hidden="true"></i>
          </button>
        }
      }
      <p-button label="Add band" icon="pi pi-plus" severity="secondary" outlined fluid (onClick)="addToleranceBand()" />
    </app-panel-group>

    <app-panel-group label="Tooltip" icon="◐">
      <p class="panel-hint">Shown when hovering a point, alongside X and Y.</p>
      @for (col of chart().tooltipColumns(); track col.columnId) {
        <div class="panel-tooltip-row">
          <div class="panel-tooltip-row__head">
            <p-select
              [options]="chart().schema()?.columns ?? []"
              [ngModel]="col.columnId"
              optionLabel="name"
              optionValue="id"
              placeholder="Column"
              appendTo="body"
              fluid
              (onChange)="chart().replaceTooltipColumn(col.columnId, $event.value)"
            />
            <button
              type="button"
              class="panel-tooltip-row__remove"
              aria-label="Remove tooltip column"
              (click)="chart().removeTooltipColumn(col.columnId)"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="panel-grid-fields">
            <label class="panel-field">
              <span class="panel-field-label">Prefix</span>
              <input
                pInputText
                [ngModel]="col.prefix ?? ''"
                (ngModelChange)="chart().updateTooltipColumn(col.columnId, { prefix: $event })"
                placeholder="Job "
              />
            </label>
            <label class="panel-field">
              <span class="panel-field-label">Suffix</span>
              <input
                pInputText
                [ngModel]="col.suffix ?? ''"
                (ngModelChange)="chart().updateTooltipColumn(col.columnId, { suffix: $event })"
                placeholder=" mm"
              />
            </label>
          </div>
        </div>
      }
      <p-button
        label="Add column"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        fluid
        [disabled]="!chart().datasetId() || tooltipColumnsExhausted()"
        (onClick)="chart().addTooltipColumn()"
      />
    </app-panel-group>
  `,
  styles: `
    .panel-tooltip-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--app-card-border);
      border-radius: 8px;
      background: #fff;
    }

    .panel-tooltip-row__head {
      display: flex;
      align-items: center;
      gap: 6px;

      p-select {
        flex: 1;
        min-width: 0;
      }
    }

    .panel-tooltip-row__remove {
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: none;
      color: #94a3b8;
      cursor: pointer;

      &:hover {
        background: #f1f5f9;
        color: var(--app-navy);
      }
    }
  `,
})
export class PanelWidgetDetailChartComponent {
  protected readonly store = inject(ReportBuilderStore);

  readonly chart = input.required<ChartWidgetModel>();

  /** Falls back to the picked axis column's own name once one is chosen. */
  protected axisPlaceholder(columnId: string | null): string {
    return this.chart()
      .numericColumns()
      .find((c) => c.id === columnId)?.name ?? '';
  }

  /** Adds a band and jumps straight to it, rather than leaving the user to find it in the list. */
  protected addToleranceBand(): void {
    const chart = this.chart();
    const bandId = chart.addToleranceBand();
    this.store.navigate({ kind: 'chartToleranceBand', widgetId: chart.id, bandId });
  }

  protected bandSummary(band: ChartToleranceBand): string {
    if (!band.sourceDatasetId) return 'Not set up yet';
    return this.store.datasets().find((d) => d.id === band.sourceDatasetId)?.name ?? 'Dataset';
  }

  protected tooltipColumnsExhausted(): boolean {
    const total = this.chart().schema()?.columns.length ?? 0;
    return total > 0 && this.chart().tooltipColumns().length >= total;
  }
}
