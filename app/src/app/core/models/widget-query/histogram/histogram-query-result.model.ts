import { HistogramBin } from './histogram-bin.model';
import { HistogramSeriesResult } from './histogram-series-result.model';
import { ResolvedToleranceBand } from '../chart/resolved-tolerance-band.model';
import { ChartRowCounts } from '../chart/chart-row-counts.model';
import { PartialChartLoad } from '../chart/partial-chart-load.model';

export type HistogramQueryResult = ChartRowCounts &
  PartialChartLoad & {
    id: string;
    name: string;
    /** The bins, in ascending order — the shared category axis every series aligns to. */
    bins: HistogramBin[];
    series: HistogramSeriesResult[];
    /** Values left out because they fell outside a fixed range. */
    excludedCount?: number;
    toleranceBands: ResolvedToleranceBand[];
  };
