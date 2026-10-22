import { ItemFactory } from '../factory/item-factory';
import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { TestCatalogue } from './test-catalogue';

/** Shorthand for building formula items in tests. */
export class TestItems {
  public static readonly col = ItemFactory.column;

  public static readonly lit = ItemFactory.literal;

  public static readonly op = ItemFactory.operator;

  /** A call to one of the catalogue's test functions, with an expression per argument. */
  public static call(name: string, ...args: Expression[]): FormulaItem {
    return ItemFactory.function(TestCatalogue.SCOPE.functions.get(name), name, args);
  }
}
