import { FormulaItem } from './formula-item';

/**
 * A formula is an *expression*: an ordered sequence of items the user lays out — columns, values,
 * functions, bracket groups and bare operator symbols. The operators have no sides of their own; what
 * sits either side of one is simply whatever is next to it in the sequence. Reverse Polish notation
 * (see `rpn/`) turns a sequence into a tree to validate and to write out as formula text.
 */
export type Expression = readonly FormulaItem[];
