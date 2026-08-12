import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ChartType } from '../../../../core/models/report.model';
import { ChartWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';
import { PanelChartToleranceListComponent } from './panel-chart-tolerance-list.component';
import { PanelChartTooltipColumnsComponent } from './panel-chart-tooltip-columns.component';

const CHART_TYPE_OPTIONS: { label: string; value: ChartType }[] = [
  { label: 'Scatter', value: 'scatter' },
  { label: 'Line', value: 'line' },
];

/** The chart branch of the widget-detail panel: dataset, axes, series, and appearance. Tolerance bands and tooltip are their own groups. */
@Component({
  selector: 'app-panel-widget-detail-chart',
  imports: [
    FormsModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    PanelGroupComponent,
    PanelChartToleranceListComponent,
    PanelChartTooltipColumnsComponent,
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
      <label class="panel-field">
        <span class="panel-field-label">Chart type</span>
        <p-selectbutton
          [options]="chartTypeOptions"
          [ngModel]="chart().chartType()"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
          (ngModelChange)="chart().chartType.set($event)"
        />
      </label>

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

      @if (chart().chartType() === 'line') {
        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="chart-smooth"
            [ngModel]="chart().smooth()"
            (onChange)="chart().smooth.set($event.checked)"
          />
          <label for="chart-smooth">Smooth</label>
        </div>
        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="chart-show-points"
            [ngModel]="chart().showPoints()"
            (onChange)="chart().showPoints.set($event.checked)"
          />
          <label for="chart-show-points">Show points</label>
        </div>
        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="chart-area-fill"
            [ngModel]="chart().areaFill()"
            (onChange)="chart().areaFill.set($event.checked)"
          />
          <label for="chart-area-fill">Area fill</label>
        </div>
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

  protected readonly chartTypeOptions = CHART_TYPE_OPTIONS;

  /** Falls back to the picked axis column's own name once one is chosen. */
  protected axisPlaceholder(columnId: string | null): string {
    return (
      this.chart()
        .numericColumns()
        .find((c) => c.id === columnId)?.name ?? ''
    );
  }
}
