import { formatDate } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import {
  BoolColumnConfig,
  DatasetColumn,
  DatasetColumnConfiguration,
  DateColumnConfig,
  NumericColumnConfig,
} from '../../../../../core/models/dataset';
import { Aggregate, ColumnAlign } from '../../../../../core/models/report';
import { FormatRulesEditorComponent } from '../../format-rules-editor/format-rules-editor.component';
import { TableColumnModel } from '../../../models/table-column.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { DatasetSchema } from '../../../state/dataset-schema';
import { OptionCatalog } from '../../option-catalog';
import { SelectOption } from '../../select-option';
import { PanelGroupComponent } from '../../panel-group.component';
import { ColumnTypes } from '../../../models/column-types';

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
    FormatRulesEditorComponent,
  ],
  templateUrl: './panel-column-settings.component.html',
})
export class PanelColumnSettingsComponent {
  /** Each date pattern previewed on 31 December this year, so day and month can't be confused. */
  public static readonly DATE_FORMAT_OPTIONS: SelectOption<string>[] = (() => {
    const sample = new Date(new Date().getFullYear(), 11, 31, 14, 30);
    return PanelColumnSettingsComponent.DATE_FORMAT_PATTERNS.map((value) => ({
      label: formatDate(sample, value, 'en-US'),
      value,
    }));
  })();

  /** Fallback heading; the chrome shows the column's own label when there is one. */
  public static readonly title = 'Column';

  private static readonly DATE_FORMAT_PATTERNS = [
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy-MM-dd',
    'd MMM yyyy',
    'd MMMM yyyy',
    'dd/MM/yyyy HH:mm',
  ];

  public readonly dateFormats = PanelColumnSettingsComponent.DATE_FORMAT_OPTIONS;
  public readonly alignOptions = OptionCatalog.HORIZONTAL_ALIGN;

  public readonly column = computed(() => {
    const columnId = this.columnId();
    return columnId ? (this.table()?.column(columnId) ?? null) : null;
  });

  public readonly schemaColumn = computed(() => this.column()?.schemaColumn() ?? null);

  /** The column config narrowed to each editable shape; a mismatched or missing config reads as empty. */
  public readonly numericConfig = computed<NumericColumnConfig>(() => {
    const config = this.schemaColumn()?.configuration;
    return config?.kind === 'numeric' ? config : { kind: 'numeric' };
  });

  public readonly dateConfig = computed<DateColumnConfig>(() => {
    const config = this.schemaColumn()?.configuration;
    return config?.kind === 'date' ? config : { kind: 'date' };
  });

  public readonly boolConfig = computed<BoolColumnConfig>(() => {
    const config = this.schemaColumn()?.configuration;
    return config?.kind === 'bool' ? config : { kind: 'bool' };
  });

  /** Count on any column; numeric aggregates on number columns. */
  public readonly totalOptions = computed<SelectOption<Aggregate | null>[]>(() => {
    const options: SelectOption<Aggregate | null>[] = [
      { label: 'None', value: null },
      { label: 'Count of values', value: 'count' },
    ];
    const schemaColumn = this.schemaColumn();
    if (schemaColumn && this.isNumeric(schemaColumn)) {
      options.push(
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'average' },
        { label: 'Min', value: 'min' },
        { label: 'Max', value: 'max' },
      );
    }
    return options;
  });

  public readonly showsTotals = computed(() => this.table()?.appearance.showTotals() ?? false);

  public readonly effectiveAlign = computed<ColumnAlign>(() => {
    const explicit = this.column()?.align();
    if (explicit) return explicit;
    const schemaColumn = this.schemaColumn();
    return schemaColumn && this.isNumeric(schemaColumn) ? 'right' : 'left';
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);
  private readonly schema = inject(DatasetSchema);
  private readonly table = this.session.selectedTableWidget;

  private readonly columnId = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'columnSettings' ? view.columnId : null;
  });

  public isNumeric(column: DatasetColumn): boolean {
    return ColumnTypes.isNumeric(column.type);
  }

  public toleranceSummary(column: TableColumnModel): string {
    const tolerance = column.tolerance();
    if (!tolerance) return 'Not set';
    return tolerance.match ? 'Highlighting on · matched by value' : 'Highlighting on';
  }

  public openTolerance(columnId: string): void {
    const widgetId = this.table()?.id;
    if (widgetId) this.navigation.navigate({ kind: 'columnTolerance', widgetId, columnId });
  }

  public patchNumeric(patch: Partial<Omit<NumericColumnConfig, 'kind'>>): void {
    this.saveConfig({ ...this.numericConfig(), ...patch });
  }

  public patchDate(patch: Partial<Omit<DateColumnConfig, 'kind'>>): void {
    this.saveConfig({ ...this.dateConfig(), ...patch });
  }

  public patchBool(patch: Partial<Omit<BoolColumnConfig, 'kind'>>): void {
    this.saveConfig({ ...this.boolConfig(), ...patch });
  }

  public remove(columnId: string): void {
    this.table()?.removeColumn(columnId);
    this.navigation.back();
  }

  private saveConfig(config: DatasetColumnConfiguration): void {
    const datasetId = this.table()?.datasetId();
    const column = this.schemaColumn();
    if (!datasetId || !column) return;

    this.schema.updateColumnConfiguration(datasetId, column.id, config);
  }
}
