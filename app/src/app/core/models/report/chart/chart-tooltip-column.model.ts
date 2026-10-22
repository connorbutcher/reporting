/** One extra field shown in a point's tooltip, beyond the X/Y values. */
export type ChartTooltipColumn = {
  columnId: string;
  prefix?: string;
  suffix?: string;
  /**
   * The column's name, sent at query time only so a dataset other than the one the column was
   * picked from can fall back to its own column of that name.
   */
  columnName?: string;
};
