import { FormulaFunction } from '../../../../../core/models/dataset';
import { ColumnBlock } from '../items/column-block';
import { Expression } from '../items/expression';
import { FunctionBlock } from '../items/function-block';
import { GroupBlock } from '../items/group-block';
import { LiteralBlock } from '../items/literal-block';
import { OperatorItem } from '../items/operator-item';
import { FormulaItem } from '../items/formula-item';
import { Operators } from '../operators/operators';

/** Creates formula items, each with an id unique for the life of the page. */
export class ItemFactory {
  private static nextId = 1;

  private static readonly NUMBER_TEXT = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

  public static column(name: string): ColumnBlock {
    return { kind: 'column', id: ItemFactory.newId(), name };
  }

  public static literal(value: LiteralBlock['value']): LiteralBlock {
    return { kind: 'literal', id: ItemFactory.newId(), value };
  }

  public static operator(op: string): OperatorItem {
    return { kind: 'operator', id: ItemFactory.newId(), op };
  }

  public static group(body: Expression = []): GroupBlock {
    return { kind: 'group', id: ItemFactory.newId(), body };
  }

  /** A function block with an empty argument per parameter (two for a repeating one, so it reads as a list). */
  public static function(
    fn: FormulaFunction | undefined,
    name: string,
    args?: Expression[],
  ): FunctionBlock {
    return {
      kind: 'function',
      id: ItemFactory.newId(),
      name,
      args: args ?? ItemFactory.emptyArguments(fn),
    };
  }

  public static emptyArguments(fn: FormulaFunction | undefined): Expression[] {
    if (!fn) {
      return [];
    }

    const args: Expression[] = fn.parameters.map(() => []);
    if (fn.parameters.at(-1)?.isVariadic) {
      args.push([]);
    }

    return args;
  }

  /** A deep copy with fresh ids, so a copy can sit beside its original without the two sharing an identity. */
  public static clone(item: FormulaItem): FormulaItem {
    switch (item.kind) {
      case 'function':
        return {
          ...item,
          id: ItemFactory.newId(),
          args: item.args.map(ItemFactory.cloneExpression),
        };
      case 'group':
        return { ...item, id: ItemFactory.newId(), body: ItemFactory.cloneExpression(item.body) };
      default:
        return { ...item, id: ItemFactory.newId() };
    }
  }

  /**
   * The item that typed text stands for. An operator symbol becomes that operator, a number a number, text in
   * quotes the text inside them; anything else is text, kept as typed — a separator like " - " is often the point.
   */
  public static fromText(text: string): FormulaItem {
    const trimmed = text.trim();
    const operator = Operators.ALL.find(
      (o) => o.op === trimmed.toUpperCase() || o.symbol === trimmed,
    );

    if (operator) {
      return ItemFactory.operator(operator.op);
    }

    if (ItemFactory.NUMBER_TEXT.test(trimmed)) {
      return ItemFactory.literal(Number(trimmed));
    }

    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return ItemFactory.literal(trimmed.slice(1, -1));
    }

    return ItemFactory.literal(text);
  }

  /** The value a literal takes when its text is edited: text that reads as a number becomes one. */
  public static editedLiteralValue(text: string): LiteralBlock['value'] {
    const isNumber = text.trim() !== '' && !Number.isNaN(Number(text));
    return isNumber ? Number(text) : text;
  }

  /** A fresh item id, unique for the life of the page. */
  private static newId(): number {
    return ItemFactory.nextId++;
  }

  private static cloneExpression(expression: Expression): Expression {
    return expression.map(ItemFactory.clone);
  }
}
