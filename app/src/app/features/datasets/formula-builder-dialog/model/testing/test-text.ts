import { Expression } from '../items/expression';
import { FormulaParser } from '../parser/formula-parser';
import { RpnConversion } from '../rpn/rpn-conversion';
import { FormulaSerializer } from '../serializer/formula-serializer';
import { SlotDescription } from '../serializer/slot-description';
import { TestCatalogue } from './test-catalogue';

/** Formula text helpers for tests. */
export class TestText {
  public static describeAnyValue(): SlotDescription {
    return { name: 'value', optional: false };
  }

  /** The expression written as formula text. */
  public static write(expression: Expression): string {
    return FormulaSerializer.serialize(expression, TestText.describeAnyValue).text;
  }

  /** Formula text read and written back. */
  public static roundTrip(source: string): string {
    return TestText.write(FormulaParser.fromText(source, TestCatalogue.SCOPE.functions));
  }

  /** The reverse Polish form as readable text: operands by their column name or value, operators by their symbol. */
  public static rpnText(expression: Expression): string {
    const words: string[] = [];

    for (const token of RpnConversion.of(expression).tokens) {
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
}
