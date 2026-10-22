import { DatasetColumn, NumericColumnConfig } from '../../../../../../core/models/dataset';
import {
  ChartValueAxis,
  ControlChartMode,
  XBarRChartWidgetConfig,
} from '../../../../../../core/models/report';
import { XBarRChartQueryResult, XBarRSubgroup } from '../../../../../../core/models/widget-query';
import { ControlChartNames } from './control-chart-names';

/** A control chart's config and data, resolved once and shared by each part of its option. */
export type XBarRChart = {
  readonly config: XBarRChartWidgetConfig;
  readonly data: XBarRChartQueryResult | null;
  readonly categoryColumn: DatasetColumn;
  readonly valueColumn: DatasetColumn;
  readonly categories: string[];
  readonly subgroups: XBarRSubgroup[];
  readonly mode: ControlChartMode;
  readonly names: ControlChartNames;
  /** An attribute chart (p, np) has one grid and doesn't take the measure's units. */
  readonly attribute: boolean;
  readonly valueConfig: NumericColumnConfig | undefined;
  /** The top chart's value format: the measure's, or a percentage on a p chart. */
  readonly formatMean: (value: number) => string;
  /** The value axis config applies to the top chart; the bottom one auto-scales from zero. */
  readonly meanAxisConfig: ChartValueAxis;
  readonly highlight: boolean;
  readonly zoom: boolean;
};
