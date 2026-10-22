export type DatasetRow = {
  id: string;
  /** Keyed by column id; every value is stored as a string. */
  values: Record<string, string>;
};
