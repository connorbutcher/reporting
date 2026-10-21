/**
 * Control chart colours. Breaches use the same red as out-of-spec values; limit lines are violet
 * so they never read as a spec band.
 */
export class XBarRColors {
  public static readonly IN_CONTROL = '#2563eb';
  public static readonly OUT_OF_CONTROL = '#dc2626';
  public static readonly CENTER_LINE = '#475569';
  public static readonly LIMIT_LINE = '#7c3aed';

  /** A larger triangle too, so status isn't carried by colour alone. */
  public static readonly OUT_OF_CONTROL_POINT = {
    symbol: 'triangle',
    symbolSize: 11,
    itemStyle: { color: XBarRColors.OUT_OF_CONTROL },
  };
}
