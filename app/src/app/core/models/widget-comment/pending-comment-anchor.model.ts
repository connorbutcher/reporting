/** A chart coordinate a new comment is about to be pinned to, picked by clicking a point. */
export type PendingCommentAnchor = {
  x: number;
  y: number;
  yAxisIndex?: number;
  /** Plain text shown in the composer, e.g. "142.0 kW, 268.0 Nm" — not sent to the server. */
  label: string;
};
