import { FilterGroup } from '../../../../../core/models/filter';

/** The rows behind a clicked mark, from one binding's dataset. */
export interface ChartDrillTarget {
  datasetId: number;
  /** The heading parts after the chart title, e.g. the category and series. */
  path: string[];
  /** The binding's own filter combined with the clicked mark's conditions. */
  filter: FilterGroup | null;
}
