import { FilterGroup } from '../../../../../core/models/filter';

/** What clicking a mark on a grouping chart opens: the rows behind it, from one binding's dataset. */
export interface ChartDrillTarget {
  datasetId: number;
  /** The heading parts after the chart title, e.g. the category and series. */
  path: string[];
  /** The binding's own filter combined with the clicked mark's conditions. */
  filter: FilterGroup | null;
}
