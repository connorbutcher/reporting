import { Expression } from '../items/expression';
import { parseFormula } from '../parser/parse-formula';
import { toRpn } from '../rpn/to-rpn';
import { serializeFormula } from '../serializer/serialize-formula';
import { SlotDescription } from '../serializer/slot-description';
import { SCOPE } from './test-catalogue';

export function describeAnyValue(): SlotDescription {
  return { name: 'value', optional: false };
}

/** The expression written as formula text. */
export function write(expression: Expression): string {
  return serializeFormula(expression, describeAnyValue).text;
}

/** Formula text read and written back. */
export function roundTrip(source: string): string {
  return write(parseFormula(source, SCOPE.functions));
}

/** The reverse Polish form as readable text: operands by their column name or value, operators by their symbol. */
export function rpnText(expression: Expression): string {
  const words: string[] = [];

  for (const token of toRpn(expression).tokens) {
    if (token.type === 'missing') {
      words.push('?');
    } else if (token.type === 'operator') {
      words.push(token.unary ? `${token.item.op}u` : token.item.op);
    } else if (token.item.kind === 'column') {
      words.push(token.item.name);
    } else if (token.item.kind === 'literal') {
      words.push(String(token.item.value));
    } else {
      words.push(token.item.kind);
    }
  }

  return words.join(' ');
}
