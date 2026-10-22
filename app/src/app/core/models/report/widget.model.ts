import {
  BarChartWidgetConfig,
  BoxPlotWidgetConfig,
  ComboChartWidgetConfig,
  HistogramWidgetConfig,
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
  XBarRChartWidgetConfig,
} from './chart-config.model';
import { KpiWidgetConfig } from './kpi-config.model';
import { PivotTableWidgetConfig } from './pivot-config.model';
import { DataTableWidgetConfig } from './table-config.model';
import { StaticTextWidgetConfig } from './text-config.model';
import { WidgetBase } from './widget-base.model';

export type WidgetConfig =
  | DataTableWidgetConfig
  | StaticTextWidgetConfig
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig
  | BarChartWidgetConfig
  | ComboChartWidgetConfig
  | BoxPlotWidgetConfig
  | HistogramWidgetConfig
  | PivotTableWidgetConfig
  | XBarRChartWidgetConfig
  | KpiWidgetConfig;

/**
 * A discriminated union on `type`, so narrowing `type` also narrows `config`
 * to the matching shape (e.g. inside a `switch (widget.type)` or after a
 * `widget.type === 'dataTable'` check).
 */
export type DataTableWidget = WidgetBase & {
  type: 'dataTable';
  config: DataTableWidgetConfig;
};

export type StaticTextWidget = WidgetBase & {
  type: 'staticText';
  config: StaticTextWidgetConfig;
};

export type ScatterChartWidget = WidgetBase & {
  type: 'scatterChart';
  config: ScatterChartWidgetConfig;
};

export type LineChartWidget = WidgetBase & {
  type: 'lineChart';
  config: LineChartWidgetConfig;
};

export type BarChartWidget = WidgetBase & {
  type: 'barChart';
  config: BarChartWidgetConfig;
};

export type ComboChartWidget = WidgetBase & {
  type: 'comboChart';
  config: ComboChartWidgetConfig;
};

export type BoxPlotWidget = WidgetBase & {
  type: 'boxPlot';
  config: BoxPlotWidgetConfig;
};

export type HistogramWidget = WidgetBase & {
  type: 'histogram';
  config: HistogramWidgetConfig;
};

export type XBarRChartWidget = WidgetBase & {
  type: 'xbarRChart';
  config: XBarRChartWidgetConfig;
};

export type PivotTableWidget = WidgetBase & {
  type: 'pivotTable';
  config: PivotTableWidgetConfig;
};

export type KpiWidget = WidgetBase & {
  type: 'kpi';
  config: KpiWidgetConfig;
};

/** Every chart kind, for code that treats charts uniformly. */
export type ChartWidget =
  | ScatterChartWidget
  | LineChartWidget
  | BarChartWidget
  | ComboChartWidget
  | BoxPlotWidget
  | HistogramWidget
  | XBarRChartWidget;

export type Widget =
  | DataTableWidget
  | StaticTextWidget
  | ScatterChartWidget
  | LineChartWidget
  | BarChartWidget
  | ComboChartWidget
  | BoxPlotWidget
  | HistogramWidget
  | PivotTableWidget
  | XBarRChartWidget
  | KpiWidget;
