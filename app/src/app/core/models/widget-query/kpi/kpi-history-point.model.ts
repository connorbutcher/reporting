/** One point of a sparkline's trailing history. */
export type KpiHistoryPoint = {
  periodStart: string;
  /** Null when the bucket had nothing to reduce. */
  value: number | null;
};
