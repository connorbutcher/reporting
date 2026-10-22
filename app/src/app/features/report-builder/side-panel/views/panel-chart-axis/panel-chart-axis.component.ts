import { Component, computed, inject } from '@angular/core';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelChartXAxisComponent } from '../panel-chart-x-axis/panel-chart-x-axis.component';
import { PanelChartYAxisComponent } from '../panel-chart-y-axis/panel-chart-y-axis.component';

/** Opens the X axis or a value axis editor, depending on which axis the navigation targets. */
@Component({
  selector: 'app-panel-chart-axis',
  imports: [PanelChartXAxisComponent, PanelChartYAxisComponent],
  templateUrl: './panel-chart-axis.component.html',
})
export class PanelChartAxisComponent {
  public static readonly title = 'Axis';

  public readonly chart = inject(ReportSession).selectedChartWidget;

  public readonly isX = computed(() => this.view()?.axis === 'x');

  /** Null for the X axis, or once the axis is removed. */
  public readonly yAxis = computed(() => {
    const view = this.view();
    const chart = this.chart();
    if (!chart || !view || view.axis !== 'y') {
      return null;
    }
    const index = chart.yAxes().findIndex((a) => a.id === view.axisId);
    return index < 0 ? null : { axis: chart.yAxes()[index], index };
  });

  private readonly navigation = inject(PanelNavigation);

  private readonly view = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'chartAxis' ? view : null;
  });
}
