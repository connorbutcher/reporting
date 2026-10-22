export type ChartPoint = {
  /** A number for a numeric axis column, a category label for a text one. */
  x: number | string;
  y: number | string;
  /** The bubble size column's value for this point; absent when not bound or not set on this row. */
  size?: number | null;
  tooltipLines: string[];
};
