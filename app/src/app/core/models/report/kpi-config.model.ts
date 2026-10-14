import { FilterGroup } from '../filter';
import { Aggregate } from './chart-config.model';
import { ToleranceConfig } from './table-config.model';
import { WidgetConfigBase } from './widget-base.model';

export type KpiValueSource = 'aggregate' | 'toleranceOutOfLimits';
export type KpiComparisonMode = 'none' | 'fixedTarget' | 'previousPeriod';
export type KpiDirection = 'higherIsBetter' | 'lowerIsBetter';
/** Whether "out of limits" tallies only failing rows, or failing and concession rows together. */
export type KpiToleranceStatusMode = 'fail' | 'failOrConcession';
/** Where the absolute value sits against the configured thresholds — independent of the trend/comparison. */
export type KpiStatus = 'none' | 'good' | 'warning' | 'critical';

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

  /** Goes before the number — a currency symbol ("£"), say. */
  unitPrefix: string;
  /** Goes after the number — "%", " kW", and the like. */
  unitSuffix: string;
  decimalPlaces: number;

  /** Absolute status bands, independent of the trend/comparison — e.g. a scrap rate that's red above 5% regardless of whether it improved. */
  thresholdsEnabled: boolean;
  /** With {@link direction} `'higherIsBetter'` these are lower bounds; with `'lowerIsBetter'`, upper bounds. */
  warningThreshold: number | null;
  criticalThreshold: number | null;

  /** Shows a small trend line of the value over its trailing history, bucketed into {@link periodDays}-wide windows. */
  showSparkline: boolean;
  sparklinePeriods: number;

  /** Fixed-target comparison mode: shows a progress bar toward the target instead of the trend arrow. */
  showAsMeter: boolean;

  /** Set, the widget becomes a capped row of mini-tiles — one reduced value per distinct value of this column — instead of one figure. */
  groupByColumnId: string | null;
  maxGroups: number;

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
