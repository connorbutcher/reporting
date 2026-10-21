/** The clicked series name and data point (category, bin or subgroup). */
export interface ChartDrillClick {
  seriesName?: string;
  seriesType?: string;
  dataIndex?: number;
}
