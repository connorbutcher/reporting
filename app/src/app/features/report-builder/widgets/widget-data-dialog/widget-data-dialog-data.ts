import { WidgetDataTable } from './widget-data-table';

/** What a widget hands the "View data" dialog: a heading, its values, and its CSV download. */
export type WidgetDataDialogData = {
  title: string;
  table: WidgetDataTable;
  downloadCsv: () => void;
};
