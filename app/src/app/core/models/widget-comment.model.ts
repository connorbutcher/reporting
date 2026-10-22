/** A comment's author, or someone `@`-mentioned in one — by stable ref id. */
export type WidgetCommentAuthor = {
  id: string;
  displayName: string;
};

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

export type CreateWidgetComment = {
  body: string;
  anchorX?: number;
  anchorY?: number;
  anchorYAxisIndex?: number;
  mentionedUserIds: string[];
};

/** A chart coordinate a new comment is about to be pinned to, picked by clicking a point. */
export type PendingCommentAnchor = {
  x: number;
  y: number;
  yAxisIndex?: number;
  /** Plain text shown in the composer, e.g. "142.0 kW, 268.0 Nm" — not sent to the server. */
  label: string;
};
