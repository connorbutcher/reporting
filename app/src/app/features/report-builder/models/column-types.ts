import { DatasetColumnType } from '../../../core/models/dataset';

/** Classifies dataset column types. */
export class ColumnTypes {
  public static isNumeric(type: DatasetColumnType | null | undefined): boolean {
    return type === 'int' || type === 'double';
  }
}
