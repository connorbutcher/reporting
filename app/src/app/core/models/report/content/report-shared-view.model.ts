/** A shared filter snapshot by the short `id` a link carries. `filters` is null when the report has none with that id. */
export type ReportSharedView = {
  id: string;
  filters: string | null;
};
