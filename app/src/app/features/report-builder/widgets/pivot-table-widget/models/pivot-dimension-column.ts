/** A dimension column of the pivot: one per row field, left of the values. */
export interface PivotDimensionColumn {
  label: string;
  /** Its position among the row fields — what a dimension sort request names. */
  fieldIndex: number;
}
