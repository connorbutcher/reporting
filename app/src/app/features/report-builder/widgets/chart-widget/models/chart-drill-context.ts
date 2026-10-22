import { FilterGroup } from '../../../../../core/models/filter';
import { ChartSeriesBinding } from '../../../../../core/models/report';

/** The click and the chart's bindings, shared by each chart kind's drill target. */
export type ChartDrillContext = {
  index: number;
  seriesName: string | undefined;
  bindings: readonly ChartSeriesBinding[];
  bindingFilters: Record<string, FilterGroup | null> | null;
};
