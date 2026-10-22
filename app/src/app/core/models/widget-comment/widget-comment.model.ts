import { WidgetCommentAuthor } from './widget-comment-author.model';

export type WidgetComment = {
  id: number;
  author: WidgetCommentAuthor;
  body: string;
  createdAt: string;
  /** A point this comment is pinned to on a chart; undefined for a plain widget-level comment. */
  anchorX?: number;
  anchorY?: number;
  anchorYAxisIndex?: number;
  mentions: WidgetCommentAuthor[];
  /** Whether the current user wrote it — the server's say, not inferred client-side. */
  isOwn: boolean;
};
