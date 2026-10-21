import { BarSeriesResult } from '../../../../../../../core/models/widget-query';

export class BarSeriesName {
  public static of(s: BarSeriesResult, chartTitle: string): string {
    return s.label || chartTitle || 'Series';
  }
}
