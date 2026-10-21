import { AxisKey } from '../types/axis-key';

export class MarkAxis {
  /** A typed `{ xAxis }` or `{ yAxis }` fragment. */
  public static at(axisKey: AxisKey, value: number): { xAxis: number } | { yAxis: number } {
    return axisKey === 'xAxis' ? { xAxis: value } : { yAxis: value };
  }
}
