/** How one use reads in the columns panel and in the delete confirmation. */
export type ColumnUseLine = {
  /** The widget to open in the builder; null for the report filter. */
  widgetId: string | null;
  /** The widget's title, or its type when untitled — or "Report filter". */
  name: string;
  /** Where it sits: "Table · Overview" (blank for a report filter). */
  where: string;
  /** How it uses the column: "Table column, Filter condition ×2". */
  roles: string;
  /** PrimeIcons class for the widget's type. */
  icon: string;
};
