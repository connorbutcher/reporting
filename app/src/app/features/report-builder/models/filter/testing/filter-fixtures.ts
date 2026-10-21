import { Signal, signal } from '@angular/core';
import {
  DatasetColumn,
  DatasetColumnType,
  DatasetSchema,
} from '../../../../../core/models/dataset';
import {
  FilterCondition,
  FilterGroup,
  OperatorCatalogue,
  OperatorDescriptor,
} from '../../../../../core/models/filter';
import { FilterContext } from '../filter-context';
import { ContextOptions } from './context-options';

/** Builders for filter model specs. */
export class FilterFixtures {
  /** Operators per column type, shaped like the server's catalogue. */
  public static readonly CATALOGUE = {
    string: [
      FilterFixtures.op('equals', 1),
      FilterFixtures.op('notEquals', 1),
      FilterFixtures.op('in', 1, 'list'),
      FilterFixtures.op('isEmpty', 0, 'none'),
    ],
    int: [
      FilterFixtures.op('equals', 1, 'number'),
      FilterFixtures.op('between', 2, 'number'),
      FilterFixtures.op('inTolerance', 0, 'none'),
      FilterFixtures.op('outOfTolerance', 0, 'none'),
    ],
    double: [FilterFixtures.op('equals', 1, 'number'), FilterFixtures.op('inTolerance', 0, 'none')],
    bool: [FilterFixtures.op('isTrue', 0, 'none')],
    dateTime: [
      FilterFixtures.op('greaterThan', 1, 'date'),
      FilterFixtures.op('inLastDays', 1, 'number'),
    ],
  } as unknown as OperatorCatalogue;

  public static column(id: string, type: DatasetColumnType = 'string', name = id): DatasetColumn {
    return { id, name, type, order: 0, configuration: {} } as unknown as DatasetColumn;
  }

  public static schemaOf(columns: DatasetColumn[], id = 7, name = 'Dataset'): DatasetSchema {
    return { id, name, columns } as unknown as DatasetSchema;
  }

  /** A filter context whose signals a test can change. */
  public static contextOf(options: ContextOptions = {}): FilterContext & {
    schemaSignal: ReturnType<typeof signal<DatasetSchema | null>>;
  } {
    const schema = signal<DatasetSchema | null>(
      options.schema === undefined
        ? FilterFixtures.schemaOf(
            options.columns ?? [FilterFixtures.column('a'), FilterFixtures.column('b', 'int')],
          )
        : options.schema,
    );
    return {
      schemaSignal: schema,
      schema: schema as Signal<DatasetSchema | null>,
      catalogue: signal(
        options.catalogue === undefined ? FilterFixtures.CATALOGUE : options.catalogue,
      ),
      columns: options.scope ? signal(options.scope) : undefined,
      tolerantColumns: options.tolerant ? signal(new Set(options.tolerant)) : undefined,
      ownerId: 'owner',
      widgetId: options.widgetId,
    };
  }

  public static condition(
    columnId: string,
    operator: FilterCondition['operator'] = 'equals',
    values: string[] = [],
    enabled?: boolean,
  ): FilterCondition {
    return {
      kind: 'condition',
      columnId,
      operator,
      values,
      ...(enabled === undefined ? {} : { enabled }),
    };
  }

  public static groupOf(join: 'and' | 'or', ...children: FilterGroup['children']): FilterGroup {
    return {
      kind: 'group',
      join,
      children,
    };
  }

  private static op(
    value: OperatorDescriptor['value'],
    operandCount: number,
    operandKind: OperatorDescriptor['operandKind'] = 'text',
  ): OperatorDescriptor {
    return { value, label: value, operandCount, operandKind };
  }
}
