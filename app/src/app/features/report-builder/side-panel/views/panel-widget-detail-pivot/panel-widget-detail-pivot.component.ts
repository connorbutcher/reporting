import { Component, Signal, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatasetSummary } from '../../../../../core/models/dataset';
import { Aggregate } from '../../../../../core/models/report';
import { PivotTableWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The pivot branch of the widget-detail panel: dataset, row dimensions, measures, and filters. */
@Component({
  selector: 'app-panel-widget-detail-pivot',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-widget-detail-pivot.component.html',
  styleUrl: './panel-widget-detail-pivot.component.scss',
})
export class PanelWidgetDetailPivotComponent {
  public readonly pivot = input.required<PivotTableWidgetModel>();

  /** The aggregate options offered per measure, in menu order. */
  public readonly aggregates: { label: string; value: Aggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];

  /** Column id → name, so a chosen row field renders its column name. */
  public readonly columnName = computed(() => {
    const map = new Map<string, string>();
    for (const column of this.pivot().columns()) map.set(column.id, column.name);
    return map;
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public addRowField(columnId: string | null): void {
    if (columnId) this.pivot().addRowField(columnId);
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  /** The datasets on this report, for the data-source picker. */
  public get datasets(): Signal<DatasetSummary[]> {
    return this.session.datasets;
  }
}
