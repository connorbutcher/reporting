/** A point on the chart a comment is pinned to — just enough to place and re-identify its marker. */
export interface ChartCommentAnchor {
  x: number;
  y: number;
  yAxisIndex?: number;
}
