import { FormulaFunction } from '../../../../../core/models/dataset';
import { Expression } from '../items/expression';
import { FormulaParser } from './formula-parser';
import { FormulaTokenizer } from './formula-tokenizer';

/** Reads formula text into the builder's expression; throws `FormulaParseError` when it can't. */
export function parseFormula(source: string, functions: ReadonlyMap<string, FormulaFunction>): Expression {
  if (!source.trim()) {
    return [];
  }

  return new FormulaParser(new FormulaTokenizer(source).tokenize(), functions).parse();
}
