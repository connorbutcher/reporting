import { FilterGroup } from '../../../../core/models/filter';

/** What a pivot hands the drill-through view: the dataset, a heading, and the filter selecting the rows behind a cell. */
export type DrillThroughDialogData = {
  datasetId: number;
  title: string;
  /** The pivot's own filters together with the clicked group's conditions. */
  filter: FilterGroup | null;
};
