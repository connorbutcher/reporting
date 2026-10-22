/** One way to open a report: a label, an icon, and the router link that opens it. */
export type ReportOpenOption = {
  kind: 'view' | 'edit';
  label: string;
  icon: string;
  route: (string | number)[];
};
