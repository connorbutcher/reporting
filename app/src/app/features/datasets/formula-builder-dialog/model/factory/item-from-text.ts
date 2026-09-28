import { FormulaItem } from '../items/formula-item';
import { OPERATORS } from '../operators/operators';
import { literalBlock, operatorItem } from './item-factory';

const NUMBER_TEXT = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * The item that typed text stands for. An operator symbol becomes that operator, a number a number, text in
 * quotes the text inside them; anything else is text, kept as typed — a separator like " - " is often the point.
 */
export function itemFromText(text: string): FormulaItem {
  const trimmed = text.trim();
  const operator = OPERATORS.find((o) => o.op === trimmed.toUpperCase() || o.symbol === trimmed);

  if (operator) {
    return operatorItem(operator.op);
  }

  if (NUMBER_TEXT.test(trimmed)) {
    return literalBlock(Number(trimmed));
  }

  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return literalBlock(trimmed.slice(1, -1));
  }

  return literalBlock(text);
}
