export interface DatasetRow {
  id: string;
  /** Keyed by column id; every value is stored as a string. */
  values: Record<string, string>;
}

export interface DatasetData {
  id: number;
  name: string;
  rows: DatasetRow[];
}

/**
 * A contiguous window of a dataset's rows for the editor grid's lazy virtual
 * scroll: {@link rows} is the slice at the requested offset, {@link total} the
 * full row count so the grid can size its scrollbar without loading every row.
 */
export interface DatasetRowWindow {
  total: number;
  rows: DatasetRow[];
}
