import {
  DatasetColumn,
  FormulaFunction,
  FormulaParameter,
  FormulaValueKind,
} from '../../../../../core/models/dataset';
import { FormulaChecker } from '../checker/formula-checker';

/** A small function catalogue and column set for formula tests. */
export class TestCatalogue {
  public static readonly FUNCTIONS: FormulaFunction[] = [
    TestCatalogue.fn(
      'ROUND',
      'number',
      TestCatalogue.param('number', 'number'),
      TestCatalogue.param('digits', 'number', { isOptional: true }),
    ),
    TestCatalogue.fn('UPPER', 'text', TestCatalogue.param('text', 'text')),
    TestCatalogue.fn(
      'IF',
      'any',
      TestCatalogue.param('condition', 'bool'),
      TestCatalogue.param('then', 'any'),
      TestCatalogue.param('else', 'any'),
    ),
    TestCatalogue.fn('ISBLANK', 'bool', TestCatalogue.param('value', 'any')),
    TestCatalogue.fn(
      'SUM',
      'number',
      TestCatalogue.param('number', 'number', { isVariadic: true }),
    ),
    TestCatalogue.fn(
      'DATEADD',
      'date',
      TestCatalogue.param('unit', 'text'),
      TestCatalogue.param('amount', 'number'),
      TestCatalogue.param('date', 'date'),
    ),
  ];

  public static readonly COLUMNS: DatasetColumn[] = [
    TestCatalogue.column('Qty', 'int'),
    TestCatalogue.column('Price', 'double'),
    TestCatalogue.column('Region', 'string'),
    TestCatalogue.column('Ordered', 'dateTime'),
    TestCatalogue.column('Shipped', 'bool'),
  ];

  public static readonly SCOPE = FormulaChecker.scope(
    TestCatalogue.FUNCTIONS,
    TestCatalogue.COLUMNS,
  );

  private static param(
    name: string,
    kind: FormulaValueKind,
    extra: Partial<FormulaParameter> = {},
  ): FormulaParameter {
    return { name, kind, isOptional: false, isVariadic: false, ...extra };
  }

  private static fn(
    name: string,
    returnKind: FormulaValueKind,
    ...parameters: FormulaParameter[]
  ): FormulaFunction {
    return { name, category: 'math', description: '', example: '', returnKind, parameters };
  }

  private static column(name: string, type: DatasetColumn['type']): DatasetColumn {
    return { id: name, name, type, order: 0, configuration: { kind: 'text' } };
  }
}
