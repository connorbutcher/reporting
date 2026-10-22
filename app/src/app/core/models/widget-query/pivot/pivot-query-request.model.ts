import { FilterGroup } from '../../filter';
import { PivotFieldGrouping } from '../../report';
import { PivotMeasureRequest } from './pivot-measure-request.model';

export type PivotQueryRequest = {
  filter: FilterGroup | null;
  /** The columns rows are grouped by, in order. */
  rowFields: string[];
  /** The columns spread across the top, in order. */
  columnFields?: string[];
  /** Date fields grouped by period. */
  fieldGroupings?: PivotFieldGrouping[];
  measures: PivotMeasureRequest[];
  /** Index into {@link measures} to order rows by; null orders by the dimension keys. */
  sortMeasureIndex: number | null;
  /** Index into {@link rowFields} to order rows by first; ignored while a measure sort is set. */
  sortRowFieldIndex?: number | null;
  sortDescending: boolean;
  showGrandTotal: boolean;
  showSubtotals?: boolean;
};
