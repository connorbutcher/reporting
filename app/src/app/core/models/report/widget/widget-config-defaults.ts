import { BarChartWidgetConfig } from '../chart/bar-chart-widget-config.model';
import { BoxPlotWidgetConfig } from '../chart/box-plot-widget-config.model';
import { ChartSeriesBinding } from '../chart/chart-series-binding.model';
import { ChartSort } from '../chart/chart-sort.model';
import { ChartWidgetConfigBase } from '../chart/chart-widget-config-base.model';
import { ComboChartWidgetConfig } from '../chart/combo-chart-widget-config.model';
import { HistogramWidgetConfig } from '../chart/histogram-widget-config.model';
import { LineChartWidgetConfig } from '../chart/line-chart-widget-config.model';
import { ScatterChartWidgetConfig } from '../chart/scatter-chart-widget-config.model';
import { XBarRChartWidgetConfig } from '../chart/xbar-r-chart-widget-config.model';
import { KpiWidgetConfig } from '../kpi/kpi-widget-config.model';
import { PivotTableWidgetConfig } from '../pivot/pivot-table-widget-config.model';
import { DataTableWidgetConfig } from '../table/data-table-widget-config.model';
import { StaticTextWidgetConfig } from '../text/static-text-widget-config.model';

/** The config each new widget starts with. */
export class WidgetConfigDefaults {
  public static readonly CHART_SORT: ChartSort = {
    by: 'default',
    columnId: null,
    aggregate: 'sum',
    descending: false,
  };

  /** Bindings and axes start empty: the model seeds a binding and `ChartConfigs.axes` a primary axis. */
  public static readonly CHART_BASE: Omit<ChartWidgetConfigBase, 'type' | 'title'> = {
    showTitle: true,
    bindings: [],
    yAxes: [],
    xAxisLabel: '',
    yAxisLabel: '',
    zoom: true,
    showLegend: true,
    pointSize: 8,
    toleranceBands: [],
    guideLines: [],
    tooltipColumns: [],
  };

  public static readonly SCATTER_CHART: Omit<ScatterChartWidgetConfig, 'type'> = {
    ...WidgetConfigDefaults.CHART_BASE,
    title: 'Scatter chart',
  };

  public static readonly LINE_CHART: Omit<LineChartWidgetConfig, 'type'> = {
    ...WidgetConfigDefaults.CHART_BASE,
    title: 'Line chart',
    smooth: false,
    showPoints: true,
    areaFill: false,
  };

  public static readonly BAR_CHART: Omit<BarChartWidgetConfig, 'type'> = {
    ...WidgetConfigDefaults.CHART_BASE,
    title: 'Bar chart',
    aggregate: 'sum',
    stacked: false,
    horizontal: false,
    sort: WidgetConfigDefaults.CHART_SORT,
  };

  public static readonly COMBO_CHART: Omit<ComboChartWidgetConfig, 'type'> = {
    ...WidgetConfigDefaults.CHART_BASE,
    title: 'Combination chart',
    aggregate: 'sum',
    stacked: false,
    smooth: false,
    showPoints: true,
    areaFill: false,
    sort: WidgetConfigDefaults.CHART_SORT,
  };

  public static readonly BOX_PLOT: Omit<BoxPlotWidgetConfig, 'type'> = {
    ...WidgetConfigDefaults.CHART_BASE,
    title: 'Box plot',
    whisker: 'tukey',
    whiskerFactor: 1.5,
    sort: WidgetConfigDefaults.CHART_SORT,
    showMean: false,
    showSampleSize: false,
    showPoints: false,
    showCapability: false,
    horizontal: false,
  };

  public static readonly XBAR_R_CHART: Omit<XBarRChartWidgetConfig, 'type'> = {
    ...WidgetConfigDefaults.CHART_BASE,
    title: 'Xbar-R chart',
    sort: WidgetConfigDefaults.CHART_SORT,
    highlightOutOfControl: true,
  };

  public static readonly HISTOGRAM: Omit<HistogramWidgetConfig, 'type'> = {
    ...WidgetConfigDefaults.CHART_BASE,
    title: 'Histogram',
    binMode: 'auto',
    binCount: 10,
    binWidth: 1,
    rangeMin: null,
    rangeMax: null,
    normalize: 'count',
    cumulative: false,
    horizontal: false,
  };

  /** The id is filled in per instance. */
  public static readonly EMPTY_CHART_BINDING: Omit<ChartSeriesBinding, 'id'> = {
    datasetId: null,
    xColumnId: null,
    yColumnId: null,
    sizeColumnId: null,
    valueColumnIds: null,
    seriesColumnId: null,
    renderAs: null,
    yAxisId: null,
    label: '',
    color: null,
    symbol: null,
    dashStyle: null,
    filter: null,
    sort: null,
  };

  public static readonly KPI: Omit<KpiWidgetConfig, 'type'> = {
    datasetId: null,
    title: 'KPI',
    showTitle: true,
    valueSource: 'aggregate',
    aggregate: 'sum',
    valueColumnId: null,
    tolerance: null,
    toleranceStatusMode: 'fail',
    showAsPercent: true,
    comparisonMode: 'none',
    targetValue: null,
    dateColumnId: null,
    periodDays: 7,
    direction: 'higherIsBetter',
    unitPrefix: '',
    unitSuffix: '',
    decimalPlaces: 1,
    thresholdsEnabled: false,
    warningThreshold: null,
    criticalThreshold: null,
    showSparkline: false,
    sparklinePeriods: 8,
    showAsMeter: false,
    groupByColumnId: null,
    maxGroups: 8,
    filter: null,
  };

  public static readonly PIVOT_TABLE: Omit<PivotTableWidgetConfig, 'type'> = {
    datasetId: null,
    title: 'Pivot table',
    showTitle: true,
    rowFields: [],
    columnFields: [],
    fieldGroupings: [],
    measures: [],
    sortMeasureId: null,
    sortDescending: true,
    showGrandTotal: true,
    showSubtotals: false,
    filter: null,
  };

  public static readonly DATA_TABLE: Omit<DataTableWidgetConfig, 'type'> = {
    datasetId: null,
    title: 'Table',
    showTitle: true,
    showColumnHeaders: true,
    resizableColumns: false,
    stripedRows: false,
    showGridlines: false,
    rowHover: true,
    density: 'compact',
    paginator: false,
    rowsPerPage: 10,
    emptyMessage: 'No rows to display.',
    showTotals: false,
    showSearch: false,
    frozenColumns: 0,
    rowDetails: true,
    columns: [],
    sortColumnId: null,
    sortDirection: 'asc',
    filter: null,
  };

  /** The text is usually the whole point, so the title bar stays off until asked for. */
  public static readonly STATIC_TEXT: Omit<StaticTextWidgetConfig, 'type'> = {
    title: 'Text',
    showTitle: false,
    content: '',
    fontSize: 16,
    fontWeight: 'normal',
    italic: false,
    underline: false,
    strikethrough: false,
    lineHeight: 1.4,
    color: '#1f2937',
    backgroundColor: null,
    textAlign: 'left',
    verticalAlign: 'top',
    wrap: true,
    padding: 12,
  };
}
