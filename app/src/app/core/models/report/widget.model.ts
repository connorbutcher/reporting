import {
  BarChartWidgetConfig,
  LineChartWidgetConfig,
  ScatterChartWidgetConfig,
} from './chart-config.model';
import { DataTableWidgetConfig } from './table-config.model';
import { StaticTextWidgetConfig } from './text-config.model';
import { WidgetBase } from './widget-base.model';

export type WidgetConfig =
  | DataTableWidgetConfig
  | StaticTextWidgetConfig
  | ScatterChartWidgetConfig
  | LineChartWidgetConfig
  | BarChartWidgetConfig;

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

/** Every chart kind, for code that treats charts uniformly. */
export type ChartWidget = ScatterChartWidget | LineChartWidget | BarChartWidget;

export type Widget =
  | DataTableWidget
  | StaticTextWidget
  | ScatterChartWidget
  | LineChartWidget
  | BarChartWidget;
