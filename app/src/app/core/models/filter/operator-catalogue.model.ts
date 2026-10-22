import { DatasetColumnType } from '../dataset';
import { FilterOperandKind, FilterOperator } from './filter.model';

// --- operator catalogue, served by the API ---------------------------------

export type OperatorDescriptor = {
  value: FilterOperator;
  label: string;
  operandCount: number;
  operandKind: FilterOperandKind;
};

export type OperatorsForType = {
  type: DatasetColumnType;
  operators: OperatorDescriptor[];
};

/** Look-up built once from the catalogue, so the panel can go type → operators. */
export type OperatorCatalogue = Record<DatasetColumnType, OperatorDescriptor[]>;
