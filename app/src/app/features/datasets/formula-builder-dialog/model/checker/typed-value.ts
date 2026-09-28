import { FormulaValueKind } from '../../../../../core/models/dataset';

/** A value's kind, and the first item of it in reading order, which is where a problem with it is pointed. */
export interface TypedValue {
  kind: FormulaValueKind;
  first: number;
}
