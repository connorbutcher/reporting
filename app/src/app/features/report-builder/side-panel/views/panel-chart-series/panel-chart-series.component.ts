import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import {
  ChartSymbol,
  LineDashStyle,
  chartAxisDisplayName,
} from '../../../../../core/models/report';
import { LineChartWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/**
 * One data series' full configuration — its dataset, axes, colour-by split, style,
 * assigned Y axis, and row filter. Reached from the series list on the chart detail
 * panel, so the list stays a scannable summary rather than a stack of long cards.
 */
@Component({
  selector: 'app-panel-chart-series',
  imports: [FormsModule, ButtonModule, CheckboxModule, SelectModule, PanelGroupComponent],
  templateUrl: './panel-chart-series.component.html',
})
export class PanelChartSeriesComponent {
  public static readonly title = 'Data series';

  /** The datasets on this report, for the data-source picker. */
  public readonly datasets = inject(ReportSession).datasets;
  public readonly chart = inject(ReportSession).selectedChartWidget;

  /** The binding this screen configures, or null once it's been removed. */
  public readonly binding = computed(() => {
    const id = this.bindingId();
    return id ? (this.chart()?.binding(id) ?? null) : null;
  });

  /** Line-only options (line style, the 'None' marker) show only for a line chart. */
  public readonly isLine = computed(() => this.chart() instanceof LineChartWidgetModel);

  /** The last series can't be removed, so a chart always keeps one. */
  public readonly canRemove = computed(() => (this.chart()?.bindings().length ?? 0) > 1);

  /**
   * Per-series marker shapes; null keeps the chart kind's default. 'None' is offered
   * only on a line chart (it hides markers but keeps the line) — on a scatter it
   * would blank the series, so it's dropped there.
   */
  public readonly symbolOptions = computed<{ label: string; value: ChartSymbol | null }[]>(() => {
    const shapes: { label: string; value: ChartSymbol | null }[] = [
      { label: 'Default', value: null },
      { label: 'Circle', value: 'circle' },
      { label: 'Square', value: 'rect' },
      { label: 'Triangle', value: 'triangle' },
      { label: 'Diamond', value: 'diamond' },
    ];
    return this.isLine() ? [...shapes, { label: 'None', value: 'none' }] : shapes;
  });

  /** Per-series line dash for line charts. */
  public readonly dashOptions: { label: string; value: LineDashStyle }[] = [
    { label: 'Solid', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'Dotted', value: 'dotted' },
  ];

  /** The default swatch colour shown when a series switches from palette to a custom colour. */
  public readonly defaultColor = '#2f6fed';

  /** The chart's Y axes as picker options, for assigning this series to one. */
  public readonly axisOptions = computed(() =>
    (this.chart()?.yAxes() ?? []).map((axis, i) => ({
      label: chartAxisDisplayName(axis, i),
      value: axis.id,
    })),
  );

  /** The id treated as "the primary axis", so a series on it is stored as null. */
  public readonly primaryAxisId = computed(() => this.chart()?.yAxes()[0]?.id ?? null);

  private readonly navigation = inject(PanelNavigation);

  private readonly bindingId = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'chartSeries' ? view.bindingId : null;
  });

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  /** Removes this series and steps back to the list. */
  public removeSeries(): void {
    const chart = this.chart();
    const id = this.bindingId();
    if (chart && id) chart.removeBinding(id);
    this.navigation.back();
  }
}
