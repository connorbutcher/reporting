import { ContentRow } from './content-row';

/** A row plus the mouse event that triggered its context menu, emitted up to the page which owns the shared menu. */
export type RowAction = {
  event: MouseEvent;
  row: ContentRow;
};
