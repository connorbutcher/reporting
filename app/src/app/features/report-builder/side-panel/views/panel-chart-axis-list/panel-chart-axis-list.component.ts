import { Component, computed, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartValueAxis, ChartConfigs } from '../../../../../core/models/report';
import {
  BarChartWidgetModel,
  BoxPlotWidgetModel,
  ChartWidgetModel,
  XBarRChartWidgetModel,
} from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The chart's "Axes" group: a row per axis, each opening its own screen, plus "Add axis". */
@Component({
  selector: 'app-panel-chart-axis-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-axis-list.component.html',
})
export class PanelChartAxisListComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** Bar, box plot and Xbar-R charts have one value axis, so no "Add axis". */
  public readonly isBar = computed(
    () =>
      this.chart() instanceof BarChartWidgetModel ||
      this.chart() instanceof BoxPlotWidgetModel ||
      this.chart() instanceof XBarRChartWidgetModel,
  );

  private readonly navigation = inject(PanelNavigation);

  /** Adds a value axis and opens it. */
  public addAxis(): void {
    const chart = this.chart();
    const axisId = chart.addYAxis();
    this.navigation.navigate({ kind: 'chartAxis', widgetId: chart.id, axis: 'y', axisId });
  }

  /** Its own label, else the bound column's name, else a prompt. */
  public xLabel(): string {
    const label = this.chart().xAxisLabel().trim();
    if (label) {
      return label;
    }
    const columnId = this.chart().xColumnId();
    return (
      this.chart()
        .axisColumns()
        .find((c) => c.id === columnId)?.name ?? 'X axis'
    );
  }

  public yLabel(axis: ChartValueAxis, index: number): string {
    return ChartConfigs.axisDisplayName(axis, index);
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
