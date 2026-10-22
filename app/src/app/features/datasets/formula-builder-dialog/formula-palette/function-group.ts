import { FormulaFunction, FormulaFunctionCategory } from '../../../../core/models/dataset';

export type FunctionGroup = {
  category: FormulaFunctionCategory;
  label: string;
  functions: FormulaFunction[];
};
