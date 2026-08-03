import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableDensity } from '../../../../core/models/report.model';
import { ReportBuilderStore } from '../../report-builder.store';

const DENSITY_OPTIONS: { label: string; value: TableDensity }[] = [
  { label: 'Compact', value: 'compact' },
  { label: 'Normal', value: 'normal' },
  { label: 'Roomy', value: 'comfortable' },
];

@Component({
  selector: 'app-panel-table-appearance',
  imports: [FormsModule, CheckboxModule, InputNumberModule, InputTextModule, SelectButtonModule],
  template: `
    @if (appearance(); as appearance) {
      <div class="panel-section">
        <label class="panel-field">
          <span class="panel-field-label">Density</span>
          <p-selectbutton
            [options]="densityOptions"
            [ngModel]="appearance.density()"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            (ngModelChange)="appearance.density.set($event)"
          />
        </label>

        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="show-title"
            [ngModel]="showTitle()"
            (onChange)="setShowTitle($event.checked)"
          />
          <label for="show-title">Show table header bar</label>
        </div>

        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="show-col-headers"
            [ngModel]="appearance.showColumnHeaders()"
            (onChange)="appearance.showColumnHeaders.set($event.checked)"
          />
          <label for="show-col-headers">Show column headers</label>
        </div>

        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="resizable"
            [ngModel]="appearance.resizableColumns()"
            (onChange)="appearance.resizableColumns.set($event.checked)"
          />
          <label for="resizable">Resizable columns</label>
        </div>

        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="striped"
            [ngModel]="appearance.stripedRows()"
            (onChange)="appearance.stripedRows.set($event.checked)"
          />
          <label for="striped">Striped rows</label>
        </div>

        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="gridlines"
            [ngModel]="appearance.showGridlines()"
            (onChange)="appearance.showGridlines.set($event.checked)"
          />
          <label for="gridlines">Grid lines</label>
        </div>

        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="row-hover"
            [ngModel]="appearance.rowHover()"
            (onChange)="appearance.rowHover.set($event.checked)"
          />
          <label for="row-hover">Highlight row on hover</label>
        </div>

        <div class="panel-inline-field">
          <p-checkbox
            [binary]="true"
            inputId="paginator"
            [ngModel]="appearance.paginator()"
            (onChange)="appearance.paginator.set($event.checked)"
          />
          <label for="paginator">Paginate rows</label>
        </div>

        @if (appearance.paginator()) {
          <label class="panel-field">
            <span class="panel-field-label">Rows per page</span>
            <p-inputnumber
              [ngModel]="appearance.rowsPerPage()"
              (ngModelChange)="appearance.rowsPerPage.set($event ?? 10)"
              [min]="1"
              [max]="200"
              [showButtons]="true"
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              fluid
            />
          </label>
        }

        <label class="panel-field">
          <span class="panel-field-label">Empty message</span>
          <input
            pInputText
            [ngModel]="appearance.emptyMessage()"
            (ngModelChange)="appearance.emptyMessage.set($event)"
            placeholder="No rows to display."
          />
        </label>
      </div>
    }
  `,
})
export class PanelTableAppearanceComponent {
  protected readonly store = inject(ReportBuilderStore);
  protected readonly densityOptions = DENSITY_OPTIONS;

  protected readonly appearance = computed(() => this.store.selectedTableWidget()?.appearance ?? null);
  protected readonly showTitle = computed(() => this.store.selectedWidget()?.showTitle() ?? true);

  protected setShowTitle(value: boolean): void {
    this.store.selectedWidget()?.showTitle.set(value);
  }
}
