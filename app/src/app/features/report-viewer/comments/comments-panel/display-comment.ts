import { WidgetComment } from '../../../../core/models/widget-comment/widget-comment.model';
import { CommentPart } from './comment-part';

/** A thread comment with its body pre-split for rendering and its chart anchor, when it has one, pre-resolved. */
export type DisplayComment = WidgetComment & {
  parts: CommentPart[];
  anchor: { x: number; y: number; yAxisIndex?: number; label: string } | null;
  /** Whether this comment's own anchor is the one currently drawing attention — on the chart or the comment card alike. */
  isHighlighted: boolean;
};
