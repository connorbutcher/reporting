import { FilterOperator } from './filter-operator.model';
import { FilterOperandKind } from './filter-operand-kind.model';

// --- operator catalogue, served by the API ---------------------------------

export type OperatorDescriptor = {
  value: FilterOperator;
  label: string;
  operandCount: number;
  operandKind: FilterOperandKind;
};
