import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ChartWidgetModel, LineChartWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';
import { PanelChartToleranceListComponent } from './panel-chart-tolerance-list.component';
import { PanelChartTooltipColumnsComponent } from './panel-chart-tooltip-columns.component';
import { PanelLineChartOptionsComponent } from './panel-line-chart-options.component';

/** The chart branch of the widget-detail panel: dataset, axes, series, and appearance. Tolerance bands and tooltip are their own groups. */
@Component({
  selector: 'app-panel-widget-detail-chart',
  imports: [
    FormsModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
    PanelChartToleranceListComponent,
    PanelChartTooltipColumnsComponent,
    PanelLineChartOptionsComponent,
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

      @if (lineChart(); as line) {
        <app-panel-line-chart-options [chart]="line" />
      }
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

    <app-panel-chart-tolerance-list [chart]="chart()" />

    <app-panel-chart-tooltip-columns [chart]="chart()" />
  `,
})
export class PanelWidgetDetailChartComponent {
  protected readonly store = inject(ReportBuilderStore);

  readonly chart = input.required<ChartWidgetModel>();

  /** The model narrowed to a line chart, so line-only options render only for it. */
  protected readonly lineChart = computed(() => {
    const chart = this.chart();
    return chart instanceof LineChartWidgetModel ? chart : null;
  });

  /** Falls back to the picked axis column's own name once one is chosen. */
  protected axisPlaceholder(columnId: string | null): string {
    return (
      this.chart()
        .numericColumns()
        .find((c) => c.id === columnId)?.name ?? ''
    );
  }
}
