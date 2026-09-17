import { Component, Signal, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatasetSummary, NumericColumnConfig } from '../../../../../core/models/dataset';
import { Aggregate, KpiComparisonDirection } from '../../../../../core/models/report';
import { KpiMeasureModel, KpiWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';
import {
  KPI_COMPARISON_BINDING_ID,
  kpiMeasureFilterBindingId,
} from '../panel-widget-filters/panel-widget-filters.component';

/** The KPI branch of the widget-detail panel: dataset, measures, formula, comparison, and threshold. */
@Component({
  selector: 'app-panel-widget-detail-kpi',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-widget-detail-kpi.component.html',
  styleUrl: './panel-widget-detail-kpi.component.scss',
})
export class PanelWidgetDetailKpiComponent {
  public readonly kpi = input.required<KpiWidgetModel>();

  public readonly aggregates: { label: string; value: Aggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];

  public readonly directions: { label: string; value: KpiComparisonDirection }[] = [
    { label: 'Neutral', value: 'neutral' },
    { label: 'Higher is better', value: 'higherIsBetter' },
    { label: 'Lower is better', value: 'lowerIsBetter' },
  ];

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  public comparisonBindingId(): string {
    return KPI_COMPARISON_BINDING_ID;
  }

  public measureFilterBindingId(measure: KpiMeasureModel): string {
    return kpiMeasureFilterBindingId(measure.measureId);
  }

  /** Inserts `[alias]` at the end of the formula — simple and predictable without a cursor API. */
  public insertAlias(measure: KpiMeasureModel): void {
    const current = this.kpi().formula();
    const gap = current && !current.endsWith(' ') ? ' ' : '';
    this.kpi().formula.set(`${current}${gap}[${measure.alias()}]`);
  }

  public insertOperator(op: string): void {
    const current = this.kpi().formula();
    const gap = current && !current.endsWith(' ') ? ' ' : '';
    this.kpi().formula.set(`${current}${gap}${op} `);
  }

  public updateNumberFormat(patch: Partial<Omit<NumericColumnConfig, 'kind'>>): void {
    const current = this.kpi().numberFormat() ?? { kind: 'numeric' };
    this.kpi().numberFormat.set({ ...current, ...patch });
  }

  /** The datasets on this report, for the data-source picker. */
  public get datasets(): Signal<DatasetSummary[]> {
    return this.session.datasets;
  }
}
