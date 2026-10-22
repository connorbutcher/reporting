/** A widget's values as display text, capped so a large result stays responsive. */
export type WidgetDataTable = {
  header: string[];
  rows: string[][];
  /** Rows left out by the cap; the CSV download has them all. */
  hidden: number;
};
