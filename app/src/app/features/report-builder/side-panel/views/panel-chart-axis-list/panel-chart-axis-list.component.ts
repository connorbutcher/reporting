import { Component, computed, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartValueAxis, chartAxisDisplayName } from '../../../../../core/models/report';
import { BarChartWidgetModel, BoxPlotWidgetModel, ChartWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * The "Axes" group of the chart detail panel: a scannable row per axis — the shared
 * X axis plus each value (Y) axis — each drilling into its own
 * {@link PanelChartAxisComponent} screen, plus a button to add another value axis.
 * Mirrors the data-series list so a chart's many axes don't stack into one long card.
 */
@Component({
  selector: 'app-panel-chart-axis-list',
  imports: [ButtonModule, PanelGroupComponent],
  templateUrl: './panel-chart-axis-list.component.html',
})
export class PanelChartAxisListComponent {
  public readonly chart = input.required<ChartWidgetModel>();

  /** Bar and box plots have a single value axis, so they don't offer "Add axis". */
  public readonly isBar = computed(
    () => this.chart() instanceof BarChartWidgetModel || this.chart() instanceof BoxPlotWidgetModel,
  );

  private readonly navigation = inject(PanelNavigation);

  /** Adds a value axis and jumps straight into it, rather than leaving the user to find it in the list. */
  public addAxis(): void {
    const chart = this.chart();
    const axisId = chart.addYAxis();
    this.navigation.navigate({ kind: 'chartAxis', widgetId: chart.id, axis: 'y', axisId });
  }

  /** The X axis's row label: its own label, else the bound column's name, else a prompt. */
  public xLabel(): string {
    const label = this.chart().xAxisLabel().trim();
    if (label) return label;
    const columnId = this.chart().xColumnId();
    return this.chart().axisColumns().find((c) => c.id === columnId)?.name ?? 'X axis';
  }

  /** A value axis's row label. */
  public yLabel(axis: ChartValueAxis, index: number): string {
    return chartAxisDisplayName(axis, index);
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
