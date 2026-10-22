import { ChartSeriesResult } from './chart-series-result.model';
import { ResolvedToleranceBand } from './resolved-tolerance-band.model';
import { ChartRowCounts } from './chart-row-counts.model';
import { PartialChartLoad } from './partial-chart-load.model';

export type ChartQueryResult = ChartRowCounts &
  PartialChartLoad & {
    id: string;
    name: string;
    series: ChartSeriesResult[];
    toleranceBands: ResolvedToleranceBand[];
    /** Total rows that matched before the server's point cap; equals the plotted count when not truncated. */
    totalPoints?: number;
    /** A truncated chart thinned evenly across its X range, rather than cut off. */
    sampled?: boolean;
  };
