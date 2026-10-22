import { KpiStatus } from '../../report';

/** One tile of a grouped KPI — the reduced value for one distinct value of the group-by column. */
export type KpiGroupResult = {
  label: string;
  value: number | null;
  displayValue: string | null;
  status: KpiStatus;
};
