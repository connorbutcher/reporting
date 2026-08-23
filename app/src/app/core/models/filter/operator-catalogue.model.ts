import { DatasetColumnType } from '../dataset';
import { FilterOperandKind, FilterOperator } from './filter.model';

// --- operator catalogue, served by the API ---------------------------------

export interface OperatorDescriptor {
  value: FilterOperator;
  label: string;
  operandCount: number;
  operandKind: FilterOperandKind;
}

export interface OperatorsForType {
  type: DatasetColumnType;
  operators: OperatorDescriptor[];
}

/** Look-up built once from the catalogue, so the panel can go type → operators. */
export type OperatorCatalogue = Record<DatasetColumnType, OperatorDescriptor[]>;
