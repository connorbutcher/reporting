/** One extra field shown in a point's tooltip, beyond the X/Y values. */
export type ChartTooltipColumn = {
  columnId: string;
  prefix?: string;
  suffix?: string;
  /** Sent so another dataset can fall back to its own column of this name. */
  columnName?: string;
};
