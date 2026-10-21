/** Layout constants shared by the point chart builders. */
export class PointChartConstants {
  /** Pixels a second (or later) axis on one side is pushed out, so its scale clears the first. */
  public static readonly AXIS_OFFSET = 60;

  /** The series `name` every comment-anchor marker series shares, so a click handler can tell them apart from real data. */
  public static readonly COMMENT_ANCHOR_SERIES_NAME = '__commentAnchors';
}
