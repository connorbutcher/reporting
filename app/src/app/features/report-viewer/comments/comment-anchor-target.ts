/** Where a comment on a chart is pinned, shared between the panel and the chart that owns the point. */
export type CommentAnchorTarget = {
  widgetId: string;
  x: number;
  y: number;
  yAxisIndex?: number;
};
