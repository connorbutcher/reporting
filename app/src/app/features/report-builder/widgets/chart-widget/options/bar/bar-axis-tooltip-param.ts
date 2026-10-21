/** The echarts param an axis tooltip formatter receives for each bar series. */
export interface BarAxisTooltipParam {
  seriesName?: string;
  dataIndex: number;
  value: unknown;
  color?: unknown;
  axisValueLabel?: string;
}
