import { ChartSymbol, LineDashStyle } from '../../../../../../core/models/report/index';

/**
 * One series' presentation, resolved live from its binding's current config so appearance
 * edits reflect without a refetch. A null colour falls back to the palette (kept for a
 * colour-by split so its per-value colours survive); marker and dash apply when set.
 */
export interface SeriesStyle {
  color: string | null;
  symbol: ChartSymbol | null;
  dashStyle: LineDashStyle | null;
}
