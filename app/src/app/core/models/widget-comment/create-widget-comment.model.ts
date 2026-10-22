export type CreateWidgetComment = {
  body: string;
  anchorX?: number;
  anchorY?: number;
  anchorYAxisIndex?: number;
  mentionedUserIds: string[];
};
