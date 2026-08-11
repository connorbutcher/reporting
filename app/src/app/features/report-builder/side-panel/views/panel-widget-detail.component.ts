import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ChartWidgetModel, StaticTextWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelWidgetDetailChartComponent } from './panel-widget-detail-chart.component';
import { PanelWidgetDetailTableComponent } from './panel-widget-detail-table.component';
import { PanelWidgetDetailTextComponent } from './panel-widget-detail-text.component';

@Component({
  selector: 'app-panel-widget-detail',
  imports: [
    FormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    PanelWidgetDetailTableComponent,
    PanelWidgetDetailChartComponent,
    PanelWidgetDetailTextComponent,
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
          <app-panel-widget-detail-table [table]="table" />
        }
        @if (text(); as text) {
          <app-panel-widget-detail-text [text]="text" />
        }
        @if (chart(); as chart) {
          <app-panel-widget-detail-chart [chart]="chart" />
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
}
