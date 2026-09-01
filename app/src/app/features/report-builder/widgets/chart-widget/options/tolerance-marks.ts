import { ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import { MarkAreaData, MarkLineData } from './chart-option.types';

/** Which axis a band's marks bind to — chosen by the caller (a bar's value axis flips with orientation). */
type AxisKeyFor = (band: ResolvedToleranceBand) => 'xAxis' | 'yAxis';

// The value goes on whichever axis the band binds to; kept as a helper so the two
// mark builders set `xAxis`/`yAxis` explicitly rather than through a computed key
// (which would erase the specific field echarts types expect).
type AxisKey = 'xAxis' | 'yAxis';

// Translucent so plotted marks stay readable through the shading.
const IN_SPEC_FILL = 'rgba(22, 163, 74, 0.10)';
const CONCESSION_FILL = 'rgba(217, 119, 6, 0.13)';

/** Reference lines and shaded zones drawn from resolved tolerance bands. */
export class ToleranceMarks {
  /** Dashed line entries for every band's bounds, coloured by what crossing them means. */
  public static lines(bands: readonly ResolvedToleranceBand[], axisKeyFor: AxisKeyFor): MarkLineData {
    const entries: MarkLineData = [];

    for (const band of bands) {
      if (band.min === null || band.max === null) continue;

      const axisKey = axisKeyFor(band);
      const hasConcession = band.concessionLower !== null || band.concessionUpper !== null;
      const minMaxColor = hasConcession ? '#d97706' : '#dc2626';

      const line = (value: number, label: string, color: string): MarkLineData[number] => ({
        ...ToleranceMarks.onAxis(axisKey, value),
        label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
        lineStyle: { color, type: 'dashed', width: 1.5 },
      });

      entries.push(line(band.min, 'Min', minMaxColor), line(band.max, 'Max', minMaxColor));
      if (band.concessionLower !== null)
        entries.push(line(band.concessionLower, 'Concession lower', '#dc2626'));
      if (band.concessionUpper !== null)
        entries.push(line(band.concessionUpper, 'Concession upper', '#dc2626'));
    }

    return entries;
  }

  /** Shaded regions for every band whose `fill` is on: the in-spec zone plus amber concession shoulders. */
  public static areas(bands: readonly ResolvedToleranceBand[], axisKeyFor: AxisKeyFor): MarkAreaData {
    const areas: MarkAreaData = [];

    for (const band of bands) {
      if (!band.fill || band.min === null || band.max === null) continue;

      const axisKey = axisKeyFor(band);
      // A region is a [from, to] pair; the fill colour rides on the first edge.
      const region = (from: number, to: number, color: string): MarkAreaData[number] => [
        { ...ToleranceMarks.onAxis(axisKey, from), itemStyle: { color } },
        ToleranceMarks.onAxis(axisKey, to),
      ];

      areas.push(region(band.min, band.max, IN_SPEC_FILL));
      if (band.concessionLower !== null)
        areas.push(region(band.concessionLower, band.min, CONCESSION_FILL));
      if (band.concessionUpper !== null)
        areas.push(region(band.max, band.concessionUpper, CONCESSION_FILL));
    }

    return areas;
  }

  /** Pins a value to the chosen axis as a typed `{ xAxis }` or `{ yAxis }` fragment. */
  private static onAxis(axisKey: AxisKey, value: number): { xAxis: number } | { yAxis: number } {
    return axisKey === 'xAxis' ? { xAxis: value } : { yAxis: value };
  }
}
