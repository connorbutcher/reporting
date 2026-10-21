import { HistogramNormalize } from '../../../../../../core/models/report';
import { ChartFormat } from '../format/chart-format';

/** How bar heights read: a count, a relative frequency or a density. */
export class HistogramCounts {
  /** Frequency as a percentage, density as a plain fraction, a count with grouping. */
  public static format(value: number, normalize: HistogramNormalize): string {
    if (normalize === 'frequency') {
      return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    }
    if (normalize === 'density') {
      return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    return ChartFormat.numeric(value, undefined);
  }

  public static axisName(normalize: HistogramNormalize): string {
    switch (normalize) {
      case 'frequency':
        return 'Frequency';
      case 'density':
        return 'Density';
      default:
        return 'Count';
    }
  }
}
