/** A problem in a formula, with where it sits in the text. */
export interface FormulaError {
  message: string;
  position: number;
  length: number;
}
