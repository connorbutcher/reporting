import { FilterGroup } from '../filter';
import { Aggregate, KpiComparisonMode, KpiDirection, KpiToleranceStatusMode, KpiValueSource, ToleranceConfig } from '../report';

export interface KpiQueryRequest {
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
  unit: string;
  decimalPlaces: number;
}

/** Which way the headline number moved since the comparison value. */
export type KpiTrend = 'unknown' | 'up' | 'down' | 'flat';
/** Whether the trend is good or bad news, after folding in the widget's direction. */
export type KpiTrendSentiment = 'neutral' | 'good' | 'bad';

export interface KpiQueryResult {
  /** The reduced figure. Null when there was nothing to reduce. */
  value: number | null;
  displayValue: string | null;
  /** The target or previous-period figure {@link value} is measured against; null without a comparison. */
  comparisonValue: number | null;
  comparisonDisplayValue: string | null;
  delta: number | null;
  deltaPercent: number | null;
  trend: KpiTrend;
  sentiment: KpiTrendSentiment;
  /** Rows that fed the displayed value — the whole filtered set, or just the current window in previous-period mode. */
  matchedRowCount: number;
  totalRowCount: number;
  truncated: boolean;
}
