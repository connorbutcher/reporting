import { FilterGroup } from '../filter';
import { Aggregate } from './chart-config.model';
import { ToleranceConfig } from './table-config.model';
import { WidgetConfigBase } from './widget-base.model';

export type KpiValueSource = 'aggregate' | 'toleranceOutOfLimits';
export type KpiComparisonMode = 'none' | 'fixedTarget' | 'previousPeriod';
export type KpiDirection = 'higherIsBetter' | 'lowerIsBetter';
/** Whether "out of limits" tallies only failing rows, or failing and concession rows together. */
export type KpiToleranceStatusMode = 'fail' | 'failOrConcession';

/**
 * A single headline number reduced from a dataset: either a plain aggregate over a column
 * ({@link KpiValueSource} `'aggregate'`), or the count/percent of rows failing a tolerance band
 * (`'toleranceOutOfLimits'`, reusing {@link ToleranceConfig}). Optionally compared against a fixed
 * target or the previous rolling period, with a {@link direction} so the client knows whether the
 * trend is good or bad news.
 */
export interface KpiWidgetConfig extends WidgetConfigBase {
  type: 'kpi';

  /** Null until the user binds the widget to a dataset. */
  datasetId: number | null;

  valueSource: KpiValueSource;

  aggregate: Aggregate;
  /** The aggregated column (aggregate mode, unused for `count`), or the tolerance-checked column (tolerance mode). */
  valueColumnId: string | null;

  /** Tolerance mode: the band rows are checked against. */
  tolerance: ToleranceConfig | null;
  toleranceStatusMode: KpiToleranceStatusMode;
  /** Tolerance mode: shows the failing share as a percent of matched rows rather than a raw count. */
  showAsPercent: boolean;

  comparisonMode: KpiComparisonMode;
  /** Fixed-target mode: the value the current figure is compared against. */
  targetValue: number | null;
  /** Previous-period mode: the date column rows are windowed on. */
  dateColumnId: string | null;
  /** Previous-period mode: the rolling window length in days — "last N days" vs the N days before that. */
  periodDays: number;

  /** Whether a rising value is good or bad news — drives the trend's color, not the arithmetic. */
  direction: KpiDirection;

  unit: string;
  decimalPlaces: number;

  /** Rows this widget summarises, narrowed server-side. Null means no widget-level filter. */
  filter: FilterGroup | null;
}

export const DEFAULT_KPI_CONFIG: Omit<KpiWidgetConfig, 'type'> = {
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
  unit: '',
  decimalPlaces: 1,
  filter: null,
};
