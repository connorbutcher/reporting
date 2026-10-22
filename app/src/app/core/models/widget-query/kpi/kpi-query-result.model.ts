import { KpiTrend } from './kpi-trend.model';
import { KpiTrendSentiment } from './kpi-trend-sentiment.model';
import { KpiStatus } from '../../report';
import { KpiHistoryPoint } from './kpi-history-point.model';
import { KpiGroupResult } from './kpi-group-result.model';

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
