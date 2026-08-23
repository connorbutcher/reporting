import { formatDate } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { DatasetColumn, DatasetColumnConfiguration } from '../../../../../core/models/dataset';
import { ColumnAlign } from '../../../../../core/models/report';
import { TableColumnModel } from '../../../models/table-column.model';
import { ReportBuilderStore } from '../../../report-builder.store';
import { HORIZONTAL_ALIGN_OPTIONS, SelectOption } from '../../option-catalog';
import { PanelGroupComponent } from '../../panel-group.component';

const DATE_FORMAT_PATTERNS = [
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'd MMM yyyy',
  'd MMMM yyyy',
  'dd/MM/yyyy HH:mm',
];

/**
 * A preview of each date pattern, labelled with a sample. The sample is the 31st
 * of December in the *current* year: fixed to the 31st so day/month can't be read
 * as month/day, but the year tracks today so the previews never look stale.
 */
export const DATE_FORMAT_OPTIONS: SelectOption<string>[] = (() => {
  const sample = new Date(new Date().getFullYear(), 11, 31, 14, 30);
  return DATE_FORMAT_PATTERNS.map((value) => ({
    label: formatDate(sample, value, 'en-US'),
    value,
  }));
})();

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
  templateUrl: './panel-column-settings.component.html',
})
export class PanelColumnSettingsComponent {
  /** Fallback heading; the chrome shows the selected column's own label when there is one. */
  static readonly title = 'Column';

  private readonly store = inject(ReportBuilderStore);

  protected readonly dateFormats = DATE_FORMAT_OPTIONS;
  protected readonly alignOptions = HORIZONTAL_ALIGN_OPTIONS;

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
