import { WidgetConfigBase } from '../widget/widget-config-base.model';
import { KpiValueSource } from './kpi-value-source.model';
import { Aggregate } from '../chart/aggregate.model';
import { ToleranceConfig } from '../table/tolerance-config.model';
import { KpiToleranceStatusMode } from './kpi-tolerance-status-mode.model';
import { KpiComparisonMode } from './kpi-comparison-mode.model';
import { KpiDirection } from './kpi-direction.model';
import { FilterGroup } from '../../filter';

/**
 * A headline number: an aggregate, or the count or percent of rows outside a tolerance band,
 * optionally compared with a target or the previous period.
 */
export type KpiWidgetConfig = WidgetConfigBase & {
  type: 'kpi';

  datasetId: number | null;

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

  /** Drives the trend colour only. */
  direction: KpiDirection;

  unitPrefix: string;
  unitSuffix: string;
  decimalPlaces: number;

  /** Status bands independent of the trend. */
  thresholdsEnabled: boolean;
  /** Lower bounds when higher is better, upper bounds otherwise. */
  warningThreshold: number | null;
  criticalThreshold: number | null;

  showSparkline: boolean;
  sparklinePeriods: number;

  showAsMeter: boolean;

  /** When set, shows a mini-tile per distinct value of this column. */
  groupByColumnId: string | null;
  maxGroups: number;

  filter: FilterGroup | null;
};
