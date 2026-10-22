/** The limits dataset and which of its columns hold the bounds — what every tolerance pointer carries. */
export type ToleranceLimits = {
  sourceDatasetId: number;
  minColumnId: string;
  maxColumnId: string;
  concessionLowerColumnId?: string;
  concessionUpperColumnId?: string;
};
