import {
  BarChartWidgetConfig,
  BoxPlotWidgetConfig,
  HistogramWidgetConfig,
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
} from './chart-config.model';
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
  | BoxPlotWidgetConfig
  | HistogramWidgetConfig
  | PivotTableWidgetConfig;

/**
 * A discriminated union on `type`, so narrowing `type` also narrows `config`
 * to the matching shape (e.g. inside a `switch (widget.type)` or after a
 * `widget.type === 'dataTable'` check).
 */
export interface DataTableWidget extends WidgetBase {
  type: 'dataTable';
  config: DataTableWidgetConfig;
}

export interface StaticTextWidget extends WidgetBase {
  type: 'staticText';
  config: StaticTextWidgetConfig;
}

export interface ScatterChartWidget extends WidgetBase {
  type: 'scatterChart';
  config: ScatterChartWidgetConfig;
}

export interface LineChartWidget extends WidgetBase {
  type: 'lineChart';
  config: LineChartWidgetConfig;
}

export interface BarChartWidget extends WidgetBase {
  type: 'barChart';
  config: BarChartWidgetConfig;
}

export interface BoxPlotWidget extends WidgetBase {
  type: 'boxPlot';
  config: BoxPlotWidgetConfig;
}

export interface HistogramWidget extends WidgetBase {
  type: 'histogram';
  config: HistogramWidgetConfig;
}

export interface PivotTableWidget extends WidgetBase {
  type: 'pivotTable';
  config: PivotTableWidgetConfig;
}

/** Every chart kind, for code that treats charts uniformly. */
export type ChartWidget =
  | ScatterChartWidget
  | LineChartWidget
  | BarChartWidget
  | BoxPlotWidget
  | HistogramWidget;

export type Widget =
  | DataTableWidget
  | StaticTextWidget
  | ScatterChartWidget
  | LineChartWidget
  | BarChartWidget
  | BoxPlotWidget
  | HistogramWidget
  | PivotTableWidget;
