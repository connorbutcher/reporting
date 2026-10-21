import { Component, Signal, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatasetSummary } from '../../../../../core/models/dataset';
import {
  Aggregate,
  KpiComparisonMode,
  KpiDirection,
  KpiToleranceStatusMode,
  KpiValueSource,
} from '../../../../../core/models/report';
import { KpiWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

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
})
export class PanelWidgetDetailKpiComponent {
  public readonly kpi = input.required<KpiWidgetModel>();

  public readonly valueSources: { label: string; value: KpiValueSource }[] = [
    { label: 'Aggregate', value: 'aggregate' },
    { label: '% / count out of limits', value: 'toleranceOutOfLimits' },
  ];

  public readonly aggregates: { label: string; value: Aggregate }[] = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'average' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ];

  public readonly toleranceStatusModes: { label: string; value: KpiToleranceStatusMode }[] = [
    { label: 'Fail only', value: 'fail' },
    { label: 'Fail and concession', value: 'failOrConcession' },
  ];

  public readonly comparisonModes: { label: string; value: KpiComparisonMode }[] = [
    { label: 'None', value: 'none' },
    { label: 'Fixed target', value: 'fixedTarget' },
    { label: 'Previous period', value: 'previousPeriod' },
  ];

  public readonly directions: { label: string; value: KpiDirection }[] = [
    { label: 'Higher is better', value: 'higherIsBetter' },
    { label: 'Lower is better', value: 'lowerIsBetter' },
  ];

  /** The previous-period comparison and the sparkline both use the date column and period. */
  public readonly needsDateColumn = computed(() => {
    const kpi = this.kpi();
    return kpi.comparisonMode() === 'previousPeriod' || kpi.showSparkline();
  });

  /** Direction drives the trend's sentiment and the threshold bands. */
  public readonly needsDirection = computed(() => {
    const kpi = this.kpi();
    return kpi.comparisonMode() !== 'none' || kpi.thresholdsEnabled();
  });

  private readonly session = inject(ReportSession);
  private readonly navigation = inject(PanelNavigation);

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  public get datasets(): Signal<DatasetSummary[]> {
    return this.session.datasets;
  }
}
