import { NgTemplateOutlet } from '@angular/common';
import { Component, Signal, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatasetColumn, DatasetSummary } from '../../../../../core/models/dataset';
import {
  DateGrouping,
  PivotAggregate,
  PivotMeasure,
  PivotShowAs,
} from '../../../../../core/models/report';
import { PivotTableWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';
import { FormatRulesEditorComponent } from '../../format-rules-editor/format-rules-editor.component';

@Component({
  selector: 'app-panel-widget-detail-pivot',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
    FormatRulesEditorComponent,
  ],
  templateUrl: './panel-widget-detail-pivot.component.html',
  styleUrl: './panel-widget-detail-pivot.component.scss',
})
export class PanelWidgetDetailPivotComponent {
  public readonly pivot = input.required<PivotTableWidgetModel>();

  public readonly aggregates: { label: string; value: PivotAggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Count distinct', value: 'countDistinct' },
    { label: 'Median', value: 'median' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];

  public readonly showAsOptions: { label: string; value: PivotShowAs }[] = [
    { label: 'Value', value: 'value' },
    { label: '% of column total', value: 'percentOfTotal' },
    { label: '% of parent group', value: 'percentOfParent' },
  ];

  /** Null groups by exact value. */
  public readonly groupings: { label: string; value: DateGrouping | null }[] = [
    { label: 'Exact value', value: null },
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  public readonly directions: { label: string; value: boolean }[] = [
    { label: 'Descending', value: true },
    { label: 'Ascending', value: false },
  ];

  /** Column id to name, for chosen fields. */
  public readonly columnName = computed(() => {
    const map = new Map<string, string>();
    for (const column of this.pivot().columns()) {
      map.set(column.id, column.name);
    }
    return map;
  });

  /** Date columns offer period grouping as a field. */
  public readonly dateColumns = computed(
    () =>
      new Set(
        this.pivot()
          .columns()
          .filter((c) => c.type === 'dateTime')
          .map((c) => c.id),
      ),
  );

  /** Dimension order, then each measure by its header. */
  public readonly sortOptions = computed(() => {
    const names = this.columnName();
    const options: { label: string; value: string | null }[] = [
      { label: 'Dimension order', value: null },
    ];
    for (const measure of this.pivot().measures()) {
      options.push({ label: this.measureLabel(measure, names), value: measure.id });
    }
    return options;
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public addRowField(columnId: string | null): void {
    if (columnId) {
      this.pivot().addRowField(columnId);
    }
  }

  public addColumnField(columnId: string | null): void {
    if (columnId) {
      this.pivot().addColumnField(columnId);
    }
  }

  /** Distinct count reads any column; other aggregates need a number. */
  public measureColumns(measure: PivotMeasure): DatasetColumn[] {
    return measure.aggregate === 'countDistinct'
      ? this.pivot().columns()
      : this.pivot().numericColumns();
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  public get datasets(): Signal<DatasetSummary[]> {
    return this.session.datasets;
  }

  /** Its own label, else "Count" or "Sum of Column". */
  private measureLabel(measure: PivotMeasure, names: Map<string, string>): string {
    if (measure.label.trim()) {
      return measure.label.trim();
    }
    if (measure.aggregate === 'count') {
      return 'Count';
    }
    const column = measure.columnId ? (names.get(measure.columnId) ?? 'value') : 'value';
    if (measure.aggregate === 'countDistinct') {
      return `Distinct ${column}`;
    }
    const aggregate =
      this.aggregates.find((a) => a.value === measure.aggregate)?.label ?? measure.aggregate;
    return `${aggregate} of ${column}`;
  }
}
