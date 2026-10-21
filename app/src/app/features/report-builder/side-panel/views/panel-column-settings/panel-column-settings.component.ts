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
  /**
   * A preview of each date pattern, labelled with a sample. The sample is the 31st
   * of December in the *current* year: fixed to the 31st so day/month can't be read
   * as month/day, but the year tracks today so the previews never look stale.
   */
  public static readonly DATE_FORMAT_OPTIONS: SelectOption<string>[] = (() => {
    const sample = new Date(new Date().getFullYear(), 11, 31, 14, 30);
    return PanelColumnSettingsComponent.DATE_FORMAT_PATTERNS.map((value) => ({
      label: formatDate(sample, value, 'en-US'),
      value,
    }));
  })();
  private static readonly DATE_FORMAT_PATTERNS = [
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy-MM-dd',
    'd MMM yyyy',
    'd MMMM yyyy',
    'dd/MM/yyyy HH:mm',
  ];

  /** Fallback heading; the chrome shows the selected column's own label when there is one. */
  static readonly title = 'Column';

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);
  private readonly schema = inject(DatasetSchema);

  protected readonly dateFormats = PanelColumnSettingsComponent.DATE_FORMAT_OPTIONS;
  protected readonly alignOptions = OptionCatalog.HORIZONTAL_ALIGN;

  private readonly table = this.session.selectedTableWidget;

  private readonly columnId = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'columnSettings' ? view.columnId : null;
  });

  protected readonly column = computed(() => {
    const columnId = this.columnId();
    return columnId ? (this.table()?.column(columnId) ?? null) : null;
  });

  protected readonly schemaColumn = computed(() => this.column()?.schemaColumn() ?? null);

  /**
   * The selected column's config narrowed to each editable shape. Reading through
   * these keeps the template type-safe: a mismatched or absent config (the column
   * changed type, or none loaded yet) reads as that shape's empty default.
   */
  protected readonly numericConfig = computed<NumericColumnConfig>(() => {
    const config = this.schemaColumn()?.configuration;
    return config?.kind === 'numeric' ? config : { kind: 'numeric' };
  });

  protected readonly dateConfig = computed<DateColumnConfig>(() => {
    const config = this.schemaColumn()?.configuration;
    return config?.kind === 'date' ? config : { kind: 'date' };
  });

  protected readonly boolConfig = computed<BoolColumnConfig>(() => {
    const config = this.schemaColumn()?.configuration;
    return config?.kind === 'bool' ? config : { kind: 'bool' };
  });

  /** Totals on offer: a count on any column, and the numeric aggregates on a number column. */
  protected readonly totalOptions = computed<SelectOption<Aggregate | null>[]>(() => {
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

  protected readonly showsTotals = computed(() => this.table()?.appearance.showTotals() ?? false);

  protected readonly effectiveAlign = computed<ColumnAlign>(() => {
    const explicit = this.column()?.align();
    if (explicit) return explicit;
    const schemaColumn = this.schemaColumn();
    return schemaColumn && this.isNumeric(schemaColumn) ? 'right' : 'left';
  });

  protected isNumeric(column: DatasetColumn): boolean {
    return ColumnTypes.isNumeric(column.type);
  }

  protected toleranceSummary(column: TableColumnModel): string {
    const tolerance = column.tolerance();
    if (!tolerance) return 'Not set';
    return tolerance.match ? 'Highlighting on · matched by value' : 'Highlighting on';
  }

  protected openTolerance(columnId: string): void {
    const widgetId = this.table()?.id;
    if (widgetId) this.navigation.navigate({ kind: 'columnTolerance', widgetId, columnId });
  }

  protected patchNumeric(patch: Partial<Omit<NumericColumnConfig, 'kind'>>): void {
    this.saveConfig({ ...this.numericConfig(), ...patch });
  }

  protected patchDate(patch: Partial<Omit<DateColumnConfig, 'kind'>>): void {
    this.saveConfig({ ...this.dateConfig(), ...patch });
  }

  protected patchBool(patch: Partial<Omit<BoolColumnConfig, 'kind'>>): void {
    this.saveConfig({ ...this.boolConfig(), ...patch });
  }

  private saveConfig(config: DatasetColumnConfiguration): void {
    const datasetId = this.table()?.datasetId();
    const column = this.schemaColumn();
    if (!datasetId || !column) return;

    this.schema.updateColumnConfiguration(datasetId, column.id, config);
  }

  protected remove(columnId: string): void {
    this.table()?.removeColumn(columnId);
    this.navigation.back();
  }
}
