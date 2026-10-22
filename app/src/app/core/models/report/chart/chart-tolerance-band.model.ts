import { ChartAxis } from './chart-axis.model';

/**
 * Reference lines drawn on one axis, resolved against one row of a separate
 * limits dataset — the chart equivalent of a table column's ToleranceConfig.
 * A chart can carry several, e.g. one per spec being plotted.
 */
export type ChartToleranceBand = {
  /** Client-generated, only for addressing this band in the editor — not meaningful server-side. */
  id: string;
  axis: ChartAxis;
  /**
   * Which value axis a `y` band draws against, by {@link ChartValueAxis.id}; null —
   * or an id no longer among the chart's axes — falls back to the primary. Ignored
   * for an `x` band (the X axis is shared). Lets a band sit on the scale of the
   * series it bounds rather than always the primary axis.
   */
  yAxisId?: string | null;
  sourceDatasetId: number;
  sourceRowId: string;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
  /** Shades the in-spec zone (and any concession shoulders) between the band's lines. */
  fill?: boolean;
  /** Outlines plotted points that fall outside the band's outermost line. */
  outlinePoints?: boolean;
};
