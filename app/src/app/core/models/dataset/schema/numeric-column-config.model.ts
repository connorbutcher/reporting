/** Numeric columns (int and double). */
export type NumericColumnConfig = {
  kind: 'numeric';
  /** Fixed number of decimal places; omitted formats up to 3, trimmed of trailing zeros. */
  decimals?: number;
  /** Thousands separators, on by default. */
  useGrouping?: boolean;
  /** Text placed before/after the formatted number. */
  prefix?: string;
  suffix?: string;
};
