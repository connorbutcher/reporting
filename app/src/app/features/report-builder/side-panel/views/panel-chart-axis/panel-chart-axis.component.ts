import { Component, computed, inject } from '@angular/core';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelChartXAxisComponent } from '../panel-chart-x-axis/panel-chart-x-axis.component';
import { PanelChartYAxisComponent } from '../panel-chart-y-axis/panel-chart-y-axis.component';

/**
 * The axis screen reached from the chart detail panel's axes list. A thin dispatcher: it
 * resolves which axis the navigation targets — the shared X axis or one value (Y) axis —
 * and hands the chart to the matching editor, so neither editor carries the other's fields.
 */
@Component({
  selector: 'app-panel-chart-axis',
  imports: [PanelChartXAxisComponent, PanelChartYAxisComponent],
  templateUrl: './panel-chart-axis.component.html',
})
export class PanelChartAxisComponent {
  public static readonly title = 'Axis';

  public readonly chart = inject(ReportSession).selectedChartWidget;

  /** Whether this screen edits the shared X axis (vs a value axis). */
  public readonly isX = computed(() => this.view()?.axis === 'x');

  /** The value axis being edited with its position, or null for the X axis / once removed. */
  public readonly yAxis = computed(() => {
    const view = this.view();
    const chart = this.chart();
    if (!chart || !view || view.axis !== 'y') return null;
    const index = chart.yAxes().findIndex((a) => a.id === view.axisId);
    return index < 0 ? null : { axis: chart.yAxes()[index], index };
  });

  private readonly navigation = inject(PanelNavigation);

  private readonly view = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'chartAxis' ? view : null;
  });
}
