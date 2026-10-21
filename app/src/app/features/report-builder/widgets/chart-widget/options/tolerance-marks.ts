import { ResolvedToleranceBand } from '../../../../../core/models/widget-query';
import { MarkAreaData } from './types/mark-area-data';
import { MarkLineData } from './types/mark-line-data';
import { AxisKey } from './types/axis-key';
import { AxisKeyFor } from './types/axis-key-for';

export class ToleranceMarks {
  private static readonly IN_SPEC_FILL = 'rgba(22, 163, 74, 0.10)';
  private static readonly CONCESSION_FILL = 'rgba(217, 119, 6, 0.13)';

  public static lines(
    bands: readonly ResolvedToleranceBand[],
    axisKeyFor: AxisKeyFor<ResolvedToleranceBand>,
  ): MarkLineData {
    const entries: MarkLineData = [];

    for (const band of bands) {
      if (band.min === null || band.max === null) continue;

      const axisKey = axisKeyFor(band);
      const hasConcession = band.concessionLower !== null || band.concessionUpper !== null;
      const minMaxColor = hasConcession ? '#d97706' : '#dc2626';

      entries.push(
        ToleranceMarks.line(axisKey, band.min, 'Min', minMaxColor),
        ToleranceMarks.line(axisKey, band.max, 'Max', minMaxColor),
      );
      if (band.concessionLower !== null)
        entries.push(
          ToleranceMarks.line(axisKey, band.concessionLower, 'Concession lower', '#dc2626'),
        );
      if (band.concessionUpper !== null)
        entries.push(
          ToleranceMarks.line(axisKey, band.concessionUpper, 'Concession upper', '#dc2626'),
        );
    }

    return entries;
  }

  /** The in-spec zone plus amber concession shoulders for every filled band. */
  public static areas(
    bands: readonly ResolvedToleranceBand[],
    axisKeyFor: AxisKeyFor<ResolvedToleranceBand>,
  ): MarkAreaData {
    const areas: MarkAreaData = [];

    for (const band of bands) {
      if (!band.fill || band.min === null || band.max === null) continue;

      const axisKey = axisKeyFor(band);
      areas.push(ToleranceMarks.region(axisKey, band.min, band.max, ToleranceMarks.IN_SPEC_FILL));
      if (band.concessionLower !== null)
        areas.push(
          ToleranceMarks.region(
            axisKey,
            band.concessionLower,
            band.min,
            ToleranceMarks.CONCESSION_FILL,
          ),
        );
      if (band.concessionUpper !== null)
        areas.push(
          ToleranceMarks.region(
            axisKey,
            band.max,
            band.concessionUpper,
            ToleranceMarks.CONCESSION_FILL,
          ),
        );
    }

    return areas;
  }

  private static line(
    axisKey: AxisKey,
    value: number,
    label: string,
    color: string,
  ): MarkLineData[number] {
    return {
      ...ToleranceMarks.onAxis(axisKey, value),
      label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
      lineStyle: { color, type: 'dashed', width: 1.5 },
    };
  }

  /** The fill colour rides on the first edge. */
  private static region(
    axisKey: AxisKey,
    from: number,
    to: number,
    color: string,
  ): MarkAreaData[number] {
    return [
      { ...ToleranceMarks.onAxis(axisKey, from), itemStyle: { color } },
      ToleranceMarks.onAxis(axisKey, to),
    ];
  }

  /** A typed `{ xAxis }` or `{ yAxis }` fragment. */
  private static onAxis(axisKey: AxisKey, value: number): { xAxis: number } | { yAxis: number } {
    return axisKey === 'xAxis' ? { xAxis: value } : { yAxis: value };
  }
}
