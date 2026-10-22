import { FilterGroup } from '../../../../core/models/filter';
import { KpiWidgetConfig } from '../../../../core/models/report';
import { KpiQueryRequest } from '../../../../core/models/widget-query';

export class KpiQuery {
  /** A dataset, plus a value column unless counting, plus a tolerance when counting out-of-limits rows. */
  public static isConfigured(config: KpiWidgetConfig): boolean {
    if (!config.datasetId) {
      return false;
    }
    if (config.valueSource === 'aggregate') {
      return config.aggregate === 'count' || !!config.valueColumnId;
    }
    return !!config.valueColumnId && !!config.tolerance;
  }

  public static request(config: KpiWidgetConfig, filter: FilterGroup | null): KpiQueryRequest {
    return {
      filter,
      valueSource: config.valueSource,
      aggregate: config.aggregate,
      valueColumnId: config.valueColumnId,
      tolerance: config.tolerance,
      toleranceStatusMode: config.toleranceStatusMode,
      showAsPercent: config.showAsPercent,
      comparisonMode: config.comparisonMode,
      targetValue: config.targetValue,
      dateColumnId: config.dateColumnId,
      periodDays: config.periodDays,
      direction: config.direction,
      unitPrefix: config.unitPrefix,
      unitSuffix: config.unitSuffix,
      decimalPlaces: config.decimalPlaces,
      thresholdsEnabled: config.thresholdsEnabled,
      warningThreshold: config.warningThreshold,
      criticalThreshold: config.criticalThreshold,
      showSparkline: config.showSparkline,
      sparklinePeriods: config.sparklinePeriods,
      groupByColumnId: config.groupByColumnId,
      maxGroups: config.maxGroups,
    };
  }
}
