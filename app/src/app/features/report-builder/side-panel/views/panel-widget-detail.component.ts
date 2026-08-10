import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { ChartToleranceBand } from '../../../../core/models/report.model';
import { ChartWidgetModel, StaticTextWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

@Component({
  selector: 'app-panel-widget-detail',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    PanelGroupComponent,
  ],
  template: `
    @if (store.hasMultiSelection()) {
      <div class="panel-multi">
        <p class="panel-hint">
          {{ store.selectedWidgetIds().length }} widgets selected. Drag or nudge them together, or:
        </p>
        <p-button
          label="Duplicate selection"
          icon="pi pi-clone"
          severity="secondary"
          outlined
          fluid
          (onClick)="store.duplicateSelection()"
        />
        <p-button
          label="Remove selection"
          icon="pi pi-trash"
          severity="danger"
          outlined
          fluid
          (onClick)="store.removeWidgets(store.selectedWidgetIds())"
        />
      </div>
    }

    @if (store.selectedWidget(); as widget) {
      <div class="panel-stepper">
        <p-button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          size="small"
          ariaLabel="Previous widget"
          [disabled]="!hasPrevious()"
          (onClick)="store.stepWidget(-1)"
        />
        <span class="panel-stepper-label">{{ index() + 1 }} of {{ store.widgets().length }}</span>
        <p-button
          icon="pi pi-arrow-right"
          severity="secondary"
          text
          size="small"
          ariaLabel="Next widget"
          [disabled]="!hasNext()"
          (onClick)="store.stepWidget(1)"
        />
      </div>

      <div class="panel-section">
        <label class="panel-field">
          <span class="panel-field-label">Title</span>
          <input
            pInputText
            [ngModel]="widget.title()"
            (ngModelChange)="widget.title.set($event)"
            [placeholder]="defaultTitle(widget.type)"
          />
        </label>

        @if (table(); as table) {
          <app-panel-group label="Data source" icon="⛁">
            <label class="panel-field">
              <span class="panel-field-label">Dataset</span>
              <p-select
                [options]="store.datasets()"
                [ngModel]="table.datasetId()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select a dataset"
                appendTo="body"
                [showClear]="true"
                fluid
                (onChange)="table.setDataset($event.value ?? null)"
              />
            </label>
          </app-panel-group>

          <button
            type="button"
            class="panel-menu-item"
            [disabled]="!table.datasetId()"
            (click)="store.navigate({ kind: 'widgetColumns', widgetId: widget.id })"
          >
            <i class="pi pi-list" aria-hidden="true"></i>
            <span class="panel-menu-text">
              <span class="panel-menu-label">Columns</span>
              <span class="panel-menu-hint">
                {{ table.datasetId() ? table.columns().length + ' on the table' : 'Pick a dataset first' }}
              </span>
            </span>
            <i class="pi pi-angle-right" aria-hidden="true"></i>
          </button>

          <button
            type="button"
            class="panel-menu-item"
            [disabled]="!table.datasetId()"
            (click)="store.navigate({ kind: 'widgetFilters', widgetId: widget.id })"
          >
            <i class="pi pi-filter" aria-hidden="true"></i>
            <span class="panel-menu-text">
              <span class="panel-menu-label">Filters</span>
              <span class="panel-menu-hint">
                {{
                  !table.datasetId()
                    ? 'Pick a dataset first'
                    : table.filter.count() === 0
                      ? 'Showing every row'
                      : table.filter.count() + ' condition' + (table.filter.count() > 1 ? 's' : '')
                }}
              </span>
            </span>
            <i class="pi pi-angle-right" aria-hidden="true"></i>
          </button>

          <button
            type="button"
            class="panel-menu-item"
            (click)="store.navigate({ kind: 'tableAppearance', widgetId: widget.id })"
          >
            <i class="pi pi-palette" aria-hidden="true"></i>
            <span class="panel-menu-text">
              <span class="panel-menu-label">Appearance</span>
              <span class="panel-menu-hint">{{ table.appearance.summary() }}</span>
            </span>
            <i class="pi pi-angle-right" aria-hidden="true"></i>
          </button>
        }

        @if (text(); as text) {
          <app-panel-group label="Content" icon="▤">
            <label class="panel-field">
              <span class="panel-field-label">Content</span>
              <textarea
                pTextarea
                rows="6"
                [ngModel]="text.content()"
                (ngModelChange)="text.content.set($event)"
                placeholder="Type the text this widget should show…"
              ></textarea>
            </label>
          </app-panel-group>

          <button
            type="button"
            class="panel-menu-item"
            (click)="store.navigate({ kind: 'textStyle', widgetId: widget.id })"
          >
            <i class="pi pi-palette" aria-hidden="true"></i>
            <span class="panel-menu-text">
              <span class="panel-menu-label">Style</span>
              <span class="panel-menu-hint">Font, colour, alignment</span>
            </span>
            <i class="pi pi-angle-right" aria-hidden="true"></i>
          </button>
        }

        @if (chart(); as chart) {
          <app-panel-group label="Data source" icon="⛁">
            <label class="panel-field">
              <span class="panel-field-label">Dataset</span>
              <p-select
                [options]="store.datasets()"
                [ngModel]="chart.datasetId()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select a dataset"
                appendTo="body"
                [showClear]="true"
                fluid
                (onChange)="chart.setDataset($event.value ?? null)"
              />
            </label>
          </app-panel-group>

          <app-panel-group label="Axes" icon="＋">
            <div class="panel-grid-fields">
              <label class="panel-field">
                <span class="panel-field-label">X axis</span>
                <p-select
                  [options]="chart.numericColumns()"
                  [ngModel]="chart.xColumnId()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Column"
                  appendTo="body"
                  [disabled]="!chart.datasetId()"
                  fluid
                  (onChange)="chart.xColumnId.set($event.value ?? null)"
                />
              </label>
              <label class="panel-field">
                <span class="panel-field-label">Y axis</span>
                <p-select
                  [options]="chart.numericColumns()"
                  [ngModel]="chart.yColumnId()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Column"
                  appendTo="body"
                  [disabled]="!chart.datasetId()"
                  fluid
                  (onChange)="chart.yColumnId.set($event.value ?? null)"
                />
              </label>
            </div>
          </app-panel-group>

          <app-panel-group label="Series" icon="◐">
            <label class="panel-field">
              <span class="panel-field-label">Colour by (optional)</span>
              <p-select
                [options]="chart.schema()?.columns ?? []"
                [ngModel]="chart.seriesColumnId()"
                optionLabel="name"
                optionValue="id"
                placeholder="One series"
                appendTo="body"
                [showClear]="true"
                [disabled]="!chart.datasetId()"
                fluid
                (onChange)="chart.seriesColumnId.set($event.value ?? null)"
              />
            </label>
          </app-panel-group>

          <app-panel-group label="Appearance" icon="▤">
            <div class="panel-grid-fields">
              <label class="panel-field">
                <span class="panel-field-label">X axis label</span>
                <input
                  pInputText
                  [ngModel]="chart.xAxisLabel()"
                  (ngModelChange)="chart.xAxisLabel.set($event)"
                  [placeholder]="axisPlaceholder(chart, chart.xColumnId())"
                />
              </label>
              <label class="panel-field">
                <span class="panel-field-label">Y axis label</span>
                <input
                  pInputText
                  [ngModel]="chart.yAxisLabel()"
                  (ngModelChange)="chart.yAxisLabel.set($event)"
                  [placeholder]="axisPlaceholder(chart, chart.yColumnId())"
                />
              </label>
            </div>

            <label class="panel-field">
              <span class="panel-field-label">Point size (px)</span>
              <p-inputnumber [ngModel]="chart.pointSize()" (ngModelChange)="chart.pointSize.set($event ?? 8)" [min]="2" [max]="40" fluid />
            </label>

            <div class="panel-inline-field">
              <p-checkbox
                [binary]="true"
                inputId="chart-legend"
                [ngModel]="chart.showLegend()"
                (onChange)="chart.showLegend.set($event.checked)"
              />
              <label for="chart-legend">Show legend</label>
            </div>
          </app-panel-group>

          <button
            type="button"
            class="panel-menu-item"
            [disabled]="!chart.datasetId()"
            (click)="store.navigate({ kind: 'widgetFilters', widgetId: widget.id })"
          >
            <i class="pi pi-filter" aria-hidden="true"></i>
            <span class="panel-menu-text">
              <span class="panel-menu-label">Filters</span>
              <span class="panel-menu-hint">
                {{
                  !chart.datasetId()
                    ? 'Pick a dataset first'
                    : chart.filter.count() === 0
                      ? 'Showing every point'
                      : chart.filter.count() + ' condition' + (chart.filter.count() > 1 ? 's' : '')
                }}
              </span>
            </span>
            <i class="pi pi-angle-right" aria-hidden="true"></i>
          </button>

          <app-panel-group label="Tolerance bands" icon="⛁">
            <p class="panel-hint">Dashed reference lines resolved from a separate limits dataset.</p>
            @if (chart.toleranceBands().length === 0) {
              <p class="panel-empty">No reference lines yet.</p>
            } @else {
              @for (band of chart.toleranceBands(); track band.id) {
                <button
                  type="button"
                  class="panel-menu-item"
                  (click)="store.navigate({ kind: 'chartToleranceBand', widgetId: widget.id, bandId: band.id })"
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
            <p-button
              label="Add band"
              icon="pi pi-plus"
              severity="secondary"
              outlined
              fluid
              (onClick)="addToleranceBand(chart)"
            />
          </app-panel-group>

          <app-panel-group label="Tooltip" icon="◐">
            <p class="panel-hint">Shown when hovering a point, alongside X and Y.</p>
            @for (col of chart.tooltipColumns(); track col.columnId) {
              <div class="panel-tooltip-row">
                <div class="panel-tooltip-row__head">
                  <p-select
                    [options]="chart.schema()?.columns ?? []"
                    [ngModel]="col.columnId"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Column"
                    appendTo="body"
                    fluid
                    (onChange)="chart.replaceTooltipColumn(col.columnId, $event.value)"
                  />
                  <button
                    type="button"
                    class="panel-tooltip-row__remove"
                    aria-label="Remove tooltip column"
                    (click)="chart.removeTooltipColumn(col.columnId)"
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
                      (ngModelChange)="chart.updateTooltipColumn(col.columnId, { prefix: $event })"
                      placeholder="Job "
                    />
                  </label>
                  <label class="panel-field">
                    <span class="panel-field-label">Suffix</span>
                    <input
                      pInputText
                      [ngModel]="col.suffix ?? ''"
                      (ngModelChange)="chart.updateTooltipColumn(col.columnId, { suffix: $event })"
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
              [disabled]="!chart.datasetId() || tooltipColumnsExhausted(chart)"
              (onClick)="chart.addTooltipColumn()"
            />
          </app-panel-group>
        }

        <div class="panel-grid-fields">
          <label class="panel-field">
            <span class="panel-field-label">Column</span>
            <p-inputnumber
              [ngModel]="widget.x()"
              (ngModelChange)="widget.moveTo($event ?? 0, widget.y())"
              [min]="0"
              fluid
            />
          </label>
          <label class="panel-field">
            <span class="panel-field-label">Row</span>
            <p-inputnumber
              [ngModel]="widget.y()"
              (ngModelChange)="widget.moveTo(widget.x(), $event ?? 0)"
              [min]="0"
              fluid
            />
          </label>
          <label class="panel-field">
            <span class="panel-field-label">Width</span>
            <p-inputnumber
              [ngModel]="widget.w()"
              (ngModelChange)="widget.resizeTo($event ?? 1, widget.h())"
              [min]="1"
              fluid
            />
          </label>
          <label class="panel-field">
            <span class="panel-field-label">Height</span>
            <p-inputnumber
              [ngModel]="widget.h()"
              (ngModelChange)="widget.resizeTo(widget.w(), $event ?? 1)"
              [min]="1"
              fluid
            />
          </label>
        </div>

        <p-button
          label="Duplicate widget"
          icon="pi pi-clone"
          severity="secondary"
          outlined
          fluid
          (onClick)="store.duplicateSelection()"
        />

        <p-button
          label="Remove widget"
          icon="pi pi-trash"
          severity="danger"
          outlined
          fluid
          (onClick)="store.removeWidget(widget.id)"
        />
      </div>
    } @else {
      <p class="panel-empty">This widget is no longer on the canvas.</p>
    }
  `,
  styles: `
    .panel-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 6px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid var(--app-card-border);
      margin-bottom: 12px;
    }

    .panel-stepper-label {
      font-size: 0.75rem;
      color: #475569;
    }

    .panel-multi {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      margin-bottom: 12px;
      border: 1px solid var(--p-primary-200, #adc3e5);
      border-radius: 8px;
      background: var(--p-primary-50, #eef3fa);
    }

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
export class PanelWidgetDetailComponent {
  protected readonly store = inject(ReportBuilderStore);

  protected readonly table = this.store.selectedTableWidget;
  protected readonly text = computed(() => {
    const widget = this.store.selectedWidget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });
  protected readonly chart = computed(() => {
    const widget = this.store.selectedWidget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  protected readonly index = computed(() =>
    this.store.widgets().findIndex((w) => w.id === this.store.selectedWidgetId()),
  );
  protected readonly hasPrevious = computed(() => this.index() > 0);
  protected readonly hasNext = computed(
    () => this.index() >= 0 && this.index() < this.store.widgets().length - 1,
  );

  protected defaultTitle(type: 'dataTable' | 'staticText' | 'chart'): string {
    switch (type) {
      case 'dataTable':
        return 'Table';
      case 'chart':
        return 'Chart';
      default:
        return 'Text';
    }
  }

  /** Falls back to the picked axis column's own name once one is chosen. */
  protected axisPlaceholder(chart: ChartWidgetModel, columnId: string | null): string {
    return chart.numericColumns().find((c) => c.id === columnId)?.name ?? '';
  }

  /** Adds a band and jumps straight to it, rather than leaving the user to find it in the list. */
  protected addToleranceBand(chart: ChartWidgetModel): void {
    const bandId = chart.addToleranceBand();
    this.store.navigate({ kind: 'chartToleranceBand', widgetId: chart.id, bandId });
  }

  protected bandSummary(band: ChartToleranceBand): string {
    if (!band.sourceDatasetId) return 'Not set up yet';
    return this.store.datasets().find((d) => d.id === band.sourceDatasetId)?.name ?? 'Dataset';
  }

  protected tooltipColumnsExhausted(chart: ChartWidgetModel): boolean {
    const total = chart.schema()?.columns.length ?? 0;
    return total > 0 && chart.tooltipColumns().length >= total;
  }
}
