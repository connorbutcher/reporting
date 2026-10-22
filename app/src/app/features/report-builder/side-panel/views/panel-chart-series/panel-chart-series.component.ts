import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ChartSymbol, LineDashStyle, ChartConfigs } from '../../../../../core/models/report';
import { ChartSeriesRenderAs } from '../../../../../core/models/report';
import { ChartBindingModel } from '../../../models/chart-binding.model';
import {
  BarChartWidgetModel,
  ComboChartWidgetModel,
  HistogramWidgetModel,
  LineChartWidgetModel,
  ScatterChartWidgetModel,
} from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';
import { PanelChartSortComponent } from '../panel-chart-sort/panel-chart-sort.component';

/** One data series' configuration, opened from the chart's series list. */
@Component({
  selector: 'app-panel-chart-series',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    SelectModule,
    PanelGroupComponent,
    PanelChartSortComponent,
  ],
  templateUrl: './panel-chart-series.component.html',
})
export class PanelChartSeriesComponent {
  public static readonly title = 'Data series';

  public readonly datasets = inject(ReportSession).datasets;
  public readonly chart = inject(ReportSession).selectedChartWidget;

  /** Null once removed. */
  public readonly binding = computed(() => {
    const id = this.bindingId();
    return id ? (this.chart()?.binding(id) ?? null) : null;
  });

  /** Line-only options show for a line chart or a combo line series. */
  public readonly isLine = computed(() => this.chart() instanceof LineChartWidgetModel);

  /** Bubble sizing is scatter-only. */
  public readonly isScatter = computed(() => this.chart() instanceof ScatterChartWidgetModel);

  public readonly barChart = computed(() => {
    const chart = this.chart();
    return chart instanceof BarChartWidgetModel ? chart : null;
  });

  public readonly comboChart = computed(() => {
    const chart = this.chart();
    return chart instanceof ComboChartWidgetModel ? chart : null;
  });

  public readonly isBar = computed(() => !!this.barChart());

  public readonly isCombo = computed(() => !!this.comboChart());

  /** Bar and combo bind a category and measures, not an X/Y pair. */
  public readonly isBarLike = computed(() => this.isBar() || this.isCombo());

  /** A histogram bins one column, with no Y, marker or axis. */
  public readonly isHistogram = computed(() => this.chart() instanceof HistogramWidgetModel);

  /** Count needs no measure, so the value picker hides. */
  public readonly needsValue = computed(
    () => this.barChart()?.needsValue() ?? this.comboChart()?.needsValue() ?? true,
  );

  public readonly renderAsOptions: { label: string; value: ChartSeriesRenderAs }[] = [
    { label: 'Bars', value: 'bar' },
    { label: 'Line', value: 'line' },
  ];

  /** The last series can't be removed. */
  public readonly canRemove = computed(() => (this.chart()?.bindings().length ?? 0) > 1);

  /** Null keeps the chart's default marker. 'None' is line-only, since on a scatter it blanks the series. */
  public readonly symbolOptions = computed<{ label: string; value: ChartSymbol | null }[]>(() => {
    const shapes: { label: string; value: ChartSymbol | null }[] = [
      { label: 'Default', value: null },
      { label: 'Circle', value: 'circle' },
      { label: 'Square', value: 'rect' },
      { label: 'Triangle', value: 'triangle' },
      { label: 'Diamond', value: 'diamond' },
    ];
    return this.isLine() || this.isCombo() ? [...shapes, { label: 'None', value: 'none' }] : shapes;
  });

  public readonly dashOptions: { label: string; value: LineDashStyle }[] = [
    { label: 'Solid', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'Dotted', value: 'dotted' },
  ];

  /** The starting swatch when a series switches to a custom colour. */
  public readonly defaultColor = '#2f6fed';

  public readonly axisOptions = computed(() =>
    (this.chart()?.yAxes() ?? []).map((axis, i) => ({
      label: ChartConfigs.axisDisplayName(axis, i),
      value: axis.id,
    })),
  );

  /** A series on the primary axis is stored as null. */
  public readonly primaryAxisId = computed(() => this.chart()?.yAxes()[0]?.id ?? null);

  private readonly navigation = inject(PanelNavigation);

  private readonly bindingId = computed(() => {
    const view = this.navigation.view();
    return view.kind === 'chartSeries' ? view.bindingId : null;
  });

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  public isLineSeries(binding: ChartBindingModel): boolean {
    return this.isLine() || (this.isCombo() && binding.renderAs() === 'line');
  }

  /** Point charts and combo line series only. */
  public showMarker(binding: ChartBindingModel): boolean {
    if (this.isHistogram()) {
      return false;
    }
    return !this.isBarLike() || this.isLineSeries(binding);
  }

  /** Checking appends, so series order follows pick order. */
  public toggleValueColumn(binding: ChartBindingModel, columnId: string, checked: boolean): void {
    const current = binding.barValueColumnIds();
    const next = checked ? [...current, columnId] : current.filter((id) => id !== columnId);
    binding.setValueColumnIds(next);
  }

  /** Checking appends, so series order follows pick order. */
  public toggleHistogramValueColumn(
    binding: ChartBindingModel,
    columnId: string,
    checked: boolean,
  ): void {
    const current = binding.histogramValueColumnIds();
    const next = checked ? [...current, columnId] : current.filter((id) => id !== columnId);
    binding.setHistogramValueColumnIds(next);
  }

  /** Removes this series and returns to the list. */
  public removeSeries(): void {
    const chart = this.chart();
    const id = this.bindingId();
    if (chart && id) {
      chart.removeBinding(id);
    }
    this.navigation.back();
  }
}
