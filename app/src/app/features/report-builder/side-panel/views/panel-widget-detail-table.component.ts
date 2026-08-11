import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DataTableWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

/** The table branch of the widget-detail panel: dataset, columns, filters, and appearance. */
@Component({
  selector: 'app-panel-widget-detail-table',
  imports: [FormsModule, SelectModule, PanelGroupComponent],
  template: `
    <app-panel-group label="Data source" icon="⛁">
      <label class="panel-field">
        <span class="panel-field-label">Dataset</span>
        <p-select
          [options]="store.datasets()"
          [ngModel]="table().datasetId()"
          optionLabel="name"
          optionValue="id"
          placeholder="Select a dataset"
          appendTo="body"
          [showClear]="true"
          fluid
          (onChange)="table().setDataset($event.value ?? null)"
        />
      </label>
    </app-panel-group>

    <button
      type="button"
      class="panel-menu-item"
      [disabled]="!table().datasetId()"
      (click)="store.navigate({ kind: 'widgetColumns', widgetId: table().id })"
    >
      <i class="pi pi-list" aria-hidden="true"></i>
      <span class="panel-menu-text">
        <span class="panel-menu-label">Columns</span>
        <span class="panel-menu-hint">
          {{ table().datasetId() ? table().columns().length + ' on the table' : 'Pick a dataset first' }}
        </span>
      </span>
      <i class="pi pi-angle-right" aria-hidden="true"></i>
    </button>

    <button
      type="button"
      class="panel-menu-item"
      [disabled]="!table().datasetId()"
      (click)="store.navigate({ kind: 'widgetFilters', widgetId: table().id })"
    >
      <i class="pi pi-filter" aria-hidden="true"></i>
      <span class="panel-menu-text">
        <span class="panel-menu-label">Filters</span>
        <span class="panel-menu-hint">
          {{
            !table().datasetId()
              ? 'Pick a dataset first'
              : table().filter.count() === 0
                ? 'Showing every row'
                : table().filter.count() + ' condition' + (table().filter.count() > 1 ? 's' : '')
          }}
        </span>
      </span>
      <i class="pi pi-angle-right" aria-hidden="true"></i>
    </button>

    <button
      type="button"
      class="panel-menu-item"
      (click)="store.navigate({ kind: 'tableAppearance', widgetId: table().id })"
    >
      <i class="pi pi-palette" aria-hidden="true"></i>
      <span class="panel-menu-text">
        <span class="panel-menu-label">Appearance</span>
        <span class="panel-menu-hint">{{ table().appearance.summary() }}</span>
      </span>
      <i class="pi pi-angle-right" aria-hidden="true"></i>
    </button>
  `,
})
export class PanelWidgetDetailTableComponent {
  protected readonly store = inject(ReportBuilderStore);

  readonly table = input.required<DataTableWidgetModel>();
}
