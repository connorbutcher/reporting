import { DatasetColumnType } from '../dataset';
import { OperatorDescriptor } from './operator-descriptor.model';

/** Look-up built once from the catalogue, so the panel can go type → operators. */
export type OperatorCatalogue = Record<DatasetColumnType, OperatorDescriptor[]>;
