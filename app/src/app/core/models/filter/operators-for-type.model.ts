import { DatasetColumnType } from '../dataset';
import { OperatorDescriptor } from './operator-descriptor.model';

export type OperatorsForType = {
  type: DatasetColumnType;
  operators: OperatorDescriptor[];
};
