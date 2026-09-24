import { FormulaFunctionCategory } from './formula-function-category.model';
import { FormulaParameter } from './formula-parameter.model';
import { FormulaValueKind } from './formula-value-kind.model';

/** One function a formula can call, as the server's catalogue lists it. */
export interface FormulaFunction {
  name: string;
  category: FormulaFunctionCategory;
  description: string;
  example: string;
  returnKind: FormulaValueKind;
  parameters: FormulaParameter[];
}
