import { FilterGroup } from '../filter';
import {
  Aggregate,
  KpiComparisonMode,
  KpiDirection,
  KpiStatus,
  KpiToleranceStatusMode,
  KpiValueSource,
  ToleranceConfig,
} from '../report';

export type KpiQueryRequest = {
  filter: FilterGroup | null;

  valueSource: KpiValueSource;
  aggregate: Aggregate;
  valueColumnId: string | null;

  tolerance: ToleranceConfig | null;
  toleranceStatusMode: KpiToleranceStatusMode;
  showAsPercent: boolean;

  comparisonMode: KpiComparisonMode;
  targetValue: number | null;
  dateColumnId: string | null;
  periodDays: number;

  direction: KpiDirection;
  unitPrefix: string;
  unitSuffix: string;
  decimalPlaces: number;

  thresholdsEnabled: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;

  showSparkline: boolean;
  sparklinePeriods: number;

  groupByColumnId: string | null;
  maxGroups: number;
};

/** Which way the headline number moved since the comparison value. */
export type KpiTrend = 'unknown' | 'up' | 'down' | 'flat';
/** Whether the trend is good or bad news, after folding in the widget's direction. */
export type KpiTrendSentiment = 'neutral' | 'good' | 'bad';

/** One point of a sparkline's trailing history. */
export type KpiHistoryPoint = {
  periodStart: string;
  /** Null when the bucket had nothing to reduce. */
  value: number | null;
};

/** One tile of a grouped KPI — the reduced value for one distinct value of the group-by column. */
export type KpiGroupResult = {
  label: string;
  value: number | null;
  displayValue: string | null;
  status: KpiStatus;
};

export type KpiQueryResult = {
  /** The reduced figure. Null when there was nothing to reduce, or when {@link groups} is set instead. */
  value: number | null;
  displayValue: string | null;
  /** The target or previous-period figure {@link value} is measured against; null without a comparison. */
  comparisonValue: number | null;
  comparisonDisplayValue: string | null;
  delta: number | null;
  deltaPercent: number | null;
  trend: KpiTrend;
  sentiment: KpiTrendSentiment;
  /** Where {@link value} sits against the configured thresholds; `'none'` when they're off. */
  status: KpiStatus;
  /** The sparkline's trailing history, oldest first; empty unless the widget turned it on. */
  history: KpiHistoryPoint[];
  /** Set instead of the single-value fields above when the widget groups by a column — one tile per distinct value. */
  groups: KpiGroupResult[] | null;
  /** Rows that fed the displayed value — the whole filtered set, or just the current window in previous-period mode. */
  matchedRowCount: number;
  totalRowCount: number;
  truncated: boolean;
};
