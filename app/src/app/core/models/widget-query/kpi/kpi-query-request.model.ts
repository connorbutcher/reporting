import { FilterGroup } from '../../filter';
import {
  Aggregate,
  KpiComparisonMode,
  KpiDirection,
  KpiToleranceStatusMode,
  KpiValueSource,
  ToleranceConfig,
} from '../../report';

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
