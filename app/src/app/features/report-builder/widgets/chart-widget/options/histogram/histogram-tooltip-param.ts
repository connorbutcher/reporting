/** The echarts param an axis tooltip formatter receives for each histogram series. */
export type HistogramTooltipParam = {
  seriesName?: string;
  seriesId?: string;
  dataIndex: number;
  value: unknown;
  color?: unknown;
};
