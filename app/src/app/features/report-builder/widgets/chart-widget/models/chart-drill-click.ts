/** The click a drill reads: which series (by name) and which data point (category, bin or subgroup) was hit. */
export interface ChartDrillClick {
  seriesName?: string;
  seriesType?: string;
  dataIndex?: number;
}
