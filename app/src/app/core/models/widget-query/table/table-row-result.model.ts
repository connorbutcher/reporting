import { TableCell } from './table-cell.model';

export type TableRowResult = {
  id: string;
  cells: Record<string, TableCell>;
};
