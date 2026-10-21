/**
 * Fill + border styling for an outlined mark. echarts' own `itemStyle` is generic over a
 * per-series data-param callback (a bar's `color` may be a function, a line's may not), so no one
 * exported alias is assignable to every series' data item; this plain shape is assignable to all.
 */
export interface OutlineItemStyle {
  color: string;
  borderColor: string;
  borderWidth: number;
  /** Dashed, so an outlined mark differs in shape as well as colour. */
  borderType: 'dashed';
}
