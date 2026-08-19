import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { DatasetColumn, DatasetColumnConfiguration } from '../../../../../core/models/dataset.model';
import { ColumnAlign } from '../../../../../core/models/report.model';
import { TableColumnModel } from '../../../models/table-column.model';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelGroupComponent } from '../../panel-group.component';

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
  templateUrl: './panel-column-settings.component.html',
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
