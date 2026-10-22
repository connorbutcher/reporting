import { DatasetRow } from './dataset-row.model';

/** A slice of rows at an offset, with the total so the grid can size its scrollbar. */
export type DatasetRowWindow = {
  total: number;
  rows: DatasetRow[];
};
