import { ChartCommentAnchor } from './chart-comment-anchor';

/** A comment-anchor marker's data item — the echarts click event hands this back as `params.data`. */
export interface CommentAnchorPoint {
  value: [number, number];
  anchor: ChartCommentAnchor;
}
