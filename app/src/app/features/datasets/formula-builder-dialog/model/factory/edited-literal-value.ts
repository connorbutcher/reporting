import { LiteralBlock } from '../items/literal-block';

/** The value a literal takes when its text is edited: text that reads as a number becomes one. */
export function editedLiteralValue(text: string): LiteralBlock['value'] {
  const isNumber = text.trim() !== '' && !Number.isNaN(Number(text));
  return isNumber ? Number(text) : text;
}
