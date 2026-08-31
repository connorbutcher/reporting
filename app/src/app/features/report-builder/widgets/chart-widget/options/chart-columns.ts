import { DatasetColumn } from '../../../../../core/models/dataset';

/** Column lookup within a dataset's schema. */
export class ChartColumns {
  public static byId(columns: DatasetColumn[], id: string | null): DatasetColumn | null {
    return id ? (columns.find((c) => c.id === id) ?? null) : null;
  }
}
