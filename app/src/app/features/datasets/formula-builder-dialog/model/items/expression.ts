import { FormulaItem } from './formula-item';

/** An ordered sequence of items. Operators have no sides; RPN (see `rpn/`) turns it into a tree. */
export type Expression = readonly FormulaItem[];
