import { FormulaValueKind } from './formula-value-kind.model';

export type FormulaParameter = {
  name: string;
  kind: FormulaValueKind;
  isOptional: boolean;
  /** The last parameter may repeat, taking any number of further arguments. */
  isVariadic: boolean;
};
