import { ResolvedToleranceBand } from '../../../../../../core/models/widget-query';
import { AxisKey } from '../types/axis-key';
import { MarkAxis } from './mark-axis';
import { AxisKeyFor } from './types/axis-key-for';
import { MarkAreaData } from './types/mark-area-data';
import { MarkLineData } from './types/mark-line-data';

/** Dashed limit lines and shaded in-spec zones for tolerance bands with both limits. */
export class ToleranceMarks {
  private static readonly LIMIT_COLOR = '#dc2626';
  private static readonly CONCESSION_COLOR = '#d97706';
  private static readonly IN_SPEC_FILL = 'rgba(22, 163, 74, 0.10)';
  private static readonly CONCESSION_FILL = 'rgba(217, 119, 6, 0.13)';

  public static lines(
    bands: readonly ResolvedToleranceBand[],
    axisKeyFor: AxisKeyFor<ResolvedToleranceBand>,
  ): MarkLineData {
    return bands.flatMap((band) =>
      ToleranceMarks.hasLimits(band) ? ToleranceMarks.bandLines(band, axisKeyFor(band)) : [],
    );
  }

  /** The in-spec zone plus amber concession shoulders for every filled band. */
  public static areas(
    bands: readonly ResolvedToleranceBand[],
    axisKeyFor: AxisKeyFor<ResolvedToleranceBand>,
  ): MarkAreaData {
    return bands.flatMap((band) =>
      band.fill && ToleranceMarks.hasLimits(band)
        ? ToleranceMarks.bandAreas(band, axisKeyFor(band))
        : [],
    );
  }

  private static hasLimits(band: ResolvedToleranceBand): boolean {
    return band.min !== null && band.max !== null;
  }

  /** Min and max turn amber when concessions sit outside them; the concession limits are red. */
  private static bandLines(band: ResolvedToleranceBand, axisKey: AxisKey): MarkLineData {
    const hasConcession = band.concessionLower !== null || band.concessionUpper !== null;
    const limitColor = hasConcession ? ToleranceMarks.CONCESSION_COLOR : ToleranceMarks.LIMIT_COLOR;
    const red = ToleranceMarks.LIMIT_COLOR;
    return [
      ToleranceMarks.line(axisKey, band.min!, 'Min', limitColor),
      ToleranceMarks.line(axisKey, band.max!, 'Max', limitColor),
      ...(band.concessionLower !== null
        ? [ToleranceMarks.line(axisKey, band.concessionLower, 'Concession lower', red)]
        : []),
      ...(band.concessionUpper !== null
        ? [ToleranceMarks.line(axisKey, band.concessionUpper, 'Concession upper', red)]
        : []),
    ];
  }

  private static bandAreas(band: ResolvedToleranceBand, axisKey: AxisKey): MarkAreaData {
    const { IN_SPEC_FILL, CONCESSION_FILL } = ToleranceMarks;
    return [
      ToleranceMarks.region(axisKey, band.min!, band.max!, IN_SPEC_FILL),
      ...(band.concessionLower !== null
        ? [ToleranceMarks.region(axisKey, band.concessionLower, band.min!, CONCESSION_FILL)]
        : []),
      ...(band.concessionUpper !== null
        ? [ToleranceMarks.region(axisKey, band.max!, band.concessionUpper, CONCESSION_FILL)]
        : []),
    ];
  }

  private static line(
    axisKey: AxisKey,
    value: number,
    label: string,
    color: string,
  ): MarkLineData[number] {
    return {
      ...MarkAxis.at(axisKey, value),
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
    return [{ ...MarkAxis.at(axisKey, from), itemStyle: { color } }, MarkAxis.at(axisKey, to)];
  }
}
