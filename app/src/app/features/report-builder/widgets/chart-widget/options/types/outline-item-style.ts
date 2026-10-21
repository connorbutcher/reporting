/** Fill and border for an outlined mark, assignable to every series' data item style. */
export interface OutlineItemStyle {
  color: string;
  borderColor: string;
  borderWidth: number;
  /** Dashed, so an outlined mark differs in shape as well as colour. */
  borderType: 'dashed';
}
