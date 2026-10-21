import { DatasetColumn } from '../../../../../core/models/dataset';

export class ChartColumns {
  public static byId(columns: DatasetColumn[], id: string | null): DatasetColumn | null {
    return id ? (columns.find((c) => c.id === id) ?? null) : null;
  }
}
