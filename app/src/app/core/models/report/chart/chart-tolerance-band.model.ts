import { ChartAxis } from './chart-axis.model';

/** Reference lines resolved against one row of a limits dataset. */
export type ChartToleranceBand = {
  /** Client-generated, only for addressing this band in the editor — not meaningful server-side. */
  id: string;
  axis: ChartAxis;
  /** The {@link ChartValueAxis.id} a `y` band uses; unknown or null uses the primary. */
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
