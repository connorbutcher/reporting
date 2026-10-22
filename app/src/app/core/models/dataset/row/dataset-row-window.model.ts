import { DatasetRow } from './dataset-row.model';

/**
 * A contiguous window of a dataset's rows for the editor grid's lazy virtual
 * scroll: {@link rows} is the slice at the requested offset, {@link total} the
 * full row count so the grid can size its scrollbar without loading every row.
 */
export type DatasetRowWindow = {
  total: number;
  rows: DatasetRow[];
};
