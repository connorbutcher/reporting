import { ControlChartMode } from '../../../../../../core/models/report';
import { ControlChartNames } from './control-chart-names';

/** The names used for each control chart mode. */
export class ControlChartNaming {
  public static of(mode: ControlChartMode): ControlChartNames {
    switch (mode) {
      case 'xBarS':
        return { value: 'Mean', dispersion: 'Std dev', meanChart: 'X̄', dispersionChart: 'S' };
      case 'individuals':
        return {
          value: 'Value',
          dispersion: 'Moving range',
          meanChart: 'X',
          dispersionChart: 'MR',
        };
      case 'p':
        return {
          value: 'Proportion defective',
          dispersion: '',
          meanChart: 'p',
          dispersionChart: '',
        };
      case 'np':
        return { value: 'Defectives', dispersion: '', meanChart: 'np', dispersionChart: '' };
      default:
        return { value: 'Mean', dispersion: 'Range', meanChart: 'X̄', dispersionChart: 'R' };
    }
  }
}
