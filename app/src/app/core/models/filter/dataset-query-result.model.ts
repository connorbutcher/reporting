export type DatasetQueryResult = {
  id: number;
  name: string;
  rows: { id: string; values: Record<string, string> }[];
  totalRowCount: number;
  matchedRowCount: number;
};
