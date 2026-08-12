import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { DatasetColumn, DatasetColumnConfiguration } from '../../../../core/models/dataset.model';
import { ColumnAlign } from '../../../../core/models/report.model';
import { TableColumnModel } from '../../models/table-column.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

export const DATE_FORMAT_OPTIONS = [
  { label: '31/12/2026', value: 'dd/MM/yyyy' },
  { label: '12/31/2026', value: 'MM/dd/yyyy' },
  { label: '2026-12-31', value: 'yyyy-MM-dd' },
  { label: '31 Dec 2026', value: 'd MMM yyyy' },
  { label: '31 December 2026', value: 'd MMMM yyyy' },
  { label: '31/12/2026 14:30', value: 'dd/MM/yyyy HH:mm' },
];

const ALIGN_OPTIONS: { label: string; value: ColumnAlign }[] = [
  { label: 'Left', value: 'left' },
  { label: 'Centre', value: 'center' },
  { label: 'Right', value: 'right' },
];

@Component({
  selector: 'app-panel-column-settings',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    PanelGroupComponent,
  ],
  template: `
    @if (column(); as column) {
      <div class="panel-section">
        <app-panel-group label="Column" icon="▤">
          <label class="panel-field">
            <span class="panel-field-label">Header</span>
            <input
              pInputText
              [ngModel]="column.header()"
              (ngModelChange)="column.header.set($event)"
              [placeholder]="column.schemaColumn()?.name ?? 'Column'"
            />
          </label>

          <label class="panel-field">
            <span class="panel-field-label">Alignment</span>
            <p-selectbutton
              [options]="alignOptions"
              [ngModel]="effectiveAlign()"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
              (ngModelChange)="column.align.set($event)"
            />
          </label>

          <div class="panel-inline-field">
            <p-checkbox
              [binary]="true"
              inputId="col-sortable"
              [ngModel]="column.sortable()"
              (onChange)="column.sortable.set($event.checked)"
            />
            <label for="col-sortable">Allow sorting on this column</label>
          </div>

          <label class="panel-field">
            <span class="panel-field-label">Width (px)</span>
            <p-inputnumber
              [ngModel]="column.width()"
              (ngModelChange)="column.setWidth($event ?? null)"
              [min]="40"
              [max]="900"
              placeholder="Auto"
              fluid
            />
          </label>
        </app-panel-group>

        @if (schemaColumn(); as schemaColumn) {
          <app-panel-group label="Formatting" icon="◐">
            <p class="panel-hint">
              Formatting below is stored on the dataset column, so it applies everywhere it is used.
            </p>

            @if (isNumeric(schemaColumn)) {
              <label class="panel-field">
                <span class="panel-field-label">Decimal places</span>
                <p-inputnumber
                  [ngModel]="config().decimals ?? null"
                  (ngModelChange)="patchFormat({ decimals: $event ?? undefined })"
                  [min]="0"
                  [max]="10"
                  placeholder="Auto"
                  fluid
                />
              </label>
              <div class="panel-inline-field">
                <p-checkbox
                  [binary]="true"
                  inputId="use-grouping"
                  [ngModel]="config().useGrouping !== false"
                  (onChange)="patchFormat({ useGrouping: $event.checked })"
                />
                <label for="use-grouping">Thousands separators</label>
              </div>
              <div class="panel-grid-fields">
                <label class="panel-field">
                  <span class="panel-field-label">Prefix</span>
                  <input
                    pInputText
                    [ngModel]="config().prefix ?? ''"
                    (ngModelChange)="patchFormat({ prefix: $event })"
                    placeholder="£"
                  />
                </label>
                <label class="panel-field">
                  <span class="panel-field-label">Suffix</span>
                  <input
                    pInputText
                    [ngModel]="config().suffix ?? ''"
                    (ngModelChange)="patchFormat({ suffix: $event })"
                    placeholder="%"
                  />
                </label>
              </div>

              <button
                type="button"
                class="panel-menu-item"
                (click)="openTolerance(column.columnId)"
              >
                <i class="pi pi-shield" aria-hidden="true"></i>
                <span class="panel-menu-text">
                  <span class="panel-menu-label">Tolerance limits</span>
                  <span class="panel-menu-hint">{{ toleranceSummary(column) }}</span>
                </span>
                <i class="pi pi-chevron-right" aria-hidden="true"></i>
              </button>
            } @else if (schemaColumn.type === 'dateTime') {
              <label class="panel-field">
                <span class="panel-field-label">Date format</span>
                <p-select
                  [options]="dateFormats"
                  [ngModel]="config().dateFormat ?? 'dd/MM/yyyy'"
                  optionLabel="label"
                  optionValue="value"
                  appendTo="body"
                  fluid
                  (onChange)="patchFormat({ dateFormat: $event.value })"
                />
              </label>
            } @else if (schemaColumn.type === 'bool') {
              <div class="panel-grid-fields">
                <label class="panel-field">
                  <span class="panel-field-label">True label</span>
                  <input
                    pInputText
                    [ngModel]="config().trueLabel ?? ''"
                    (ngModelChange)="patchFormat({ trueLabel: $event })"
                    placeholder="Yes"
                  />
                </label>
                <label class="panel-field">
                  <span class="panel-field-label">False label</span>
                  <input
                    pInputText
                    [ngModel]="config().falseLabel ?? ''"
                    (ngModelChange)="patchFormat({ falseLabel: $event })"
                    placeholder="No"
                  />
                </label>
              </div>
            } @else {
              <p class="panel-empty">Text columns have no formatting options.</p>
            }
          </app-panel-group>
        } @else {
          <p class="panel-empty">This column is no longer in the dataset.</p>
        }

        <p-button
          label="Remove from table"
          icon="pi pi-times"
          severity="danger"
          outlined
          fluid
          (onClick)="remove(column.columnId)"
        />
      </div>
    } @else {
      <p class="panel-empty">This column is no longer on the table.</p>
    }
  `,
})
export class PanelColumnSettingsComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly dateFormats = DATE_FORMAT_OPTIONS;
  protected readonly alignOptions = ALIGN_OPTIONS;

  private readonly table = this.store.selectedTableWidget;

  private readonly columnId = computed(() => {
    const view = this.store.view();
    return view.kind === 'columnSettings' ? view.columnId : null;
  });

  protected readonly column = computed(() => {
    const columnId = this.columnId();
    return columnId ? (this.table()?.column(columnId) ?? null) : null;
  });

  protected readonly schemaColumn = computed(() => this.column()?.schemaColumn() ?? null);

  protected readonly config = computed<DatasetColumnConfiguration>(
    () => this.schemaColumn()?.configuration ?? {},
  );

  protected readonly effectiveAlign = computed<ColumnAlign>(() => {
    const explicit = this.column()?.align();
    if (explicit) return explicit;
    const schemaColumn = this.schemaColumn();
    return schemaColumn && this.isNumeric(schemaColumn) ? 'right' : 'left';
  });

  protected isNumeric(column: DatasetColumn): boolean {
    return column.type === 'int' || column.type === 'double';
  }

  protected toleranceSummary(column: TableColumnModel): string {
    return column.tolerance() ? 'Highlighting on' : 'Not set';
  }

  protected openTolerance(columnId: string): void {
    const widgetId = this.table()?.id;
    if (widgetId) this.store.navigate({ kind: 'columnTolerance', widgetId, columnId });
  }

  protected patchFormat(patch: DatasetColumnConfiguration): void {
    const datasetId = this.table()?.datasetId();
    const column = this.schemaColumn();
    if (!datasetId || !column) return;

    this.store.updateColumnConfiguration(datasetId, column.id, { ...this.config(), ...patch });
  }

  protected remove(columnId: string): void {
    this.table()?.removeColumn(columnId);
    this.store.back();
  }
}
