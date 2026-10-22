/** A problem in a formula, with where it sits in the text. */
export type FormulaError = {
  message: string;
  position: number;
  length: number;
};
