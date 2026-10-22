import { DatasetColumn } from '../dataset';

export type NamedColumn = Pick<DatasetColumn, 'id' | 'name' | 'type'>;
