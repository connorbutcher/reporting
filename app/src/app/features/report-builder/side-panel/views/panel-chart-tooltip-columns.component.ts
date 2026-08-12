import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ChartWidgetModel } from '../../models/widget.model';
import { PanelGroupComponent } from '../panel-group.component';

/** The "Tooltip" group of the chart detail panel: extra columns shown when hovering a point. */
@Component({
  selector: 'app-panel-chart-tooltip-columns',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, PanelGroupComponent],
  template: `
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
export class PanelChartTooltipColumnsComponent {
  readonly chart = input.required<ChartWidgetModel>();

  protected tooltipColumnsExhausted(): boolean {
    const total = this.chart().schema()?.columns.length ?? 0;
    return total > 0 && this.chart().tooltipColumns().length >= total;
  }
}
