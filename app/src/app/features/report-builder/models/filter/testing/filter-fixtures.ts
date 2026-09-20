import { Signal, signal } from '@angular/core';
import { DatasetColumn, DatasetColumnType, DatasetSchema } from '../../../../../core/models/dataset';
import {
  FilterCondition,
  FilterGroup,
  OperatorCatalogue,
  OperatorDescriptor,
} from '../../../../../core/models/filter';
import { FilterContext } from '../filter-context';

export const column = (id: string, type: DatasetColumnType = 'string', name = id): DatasetColumn =>
  ({ id, name, type, order: 0, configuration: {} }) as unknown as DatasetColumn;

export const schemaOf = (columns: DatasetColumn[], id = 7, name = 'Dataset'): DatasetSchema =>
  ({ id, name, columns }) as unknown as DatasetSchema;

const op = (
  value: OperatorDescriptor['value'],
  operandCount: number,
  operandKind: OperatorDescriptor['operandKind'] = 'text',
): OperatorDescriptor => ({ value, label: value, operandCount, operandKind });

/** Operators per column type, shaped like the server's catalogue. */
export const CATALOGUE = {
  string: [op('equals', 1), op('notEquals', 1), op('in', 1, 'list'), op('isEmpty', 0, 'none')],
  int: [
    op('equals', 1, 'number'),
    op('between', 2, 'number'),
    op('inTolerance', 0, 'none'),
    op('outOfTolerance', 0, 'none'),
  ],
  double: [op('equals', 1, 'number'), op('inTolerance', 0, 'none')],
  bool: [op('isTrue', 0, 'none')],
  dateTime: [op('greaterThan', 1, 'date'), op('inLastDays', 1, 'number')],
} as unknown as OperatorCatalogue;

export interface ContextOptions {
  columns?: DatasetColumn[];
  /** Null leaves the schema pending. */
  schema?: DatasetSchema | null;
  catalogue?: OperatorCatalogue | null;
  scope?: DatasetColumn[];
  tolerant?: string[];
  widgetId?: string;
}

/** A filter context whose signals a test can change. */
export function contextOf(options: ContextOptions = {}): FilterContext & {
  schemaSignal: ReturnType<typeof signal<DatasetSchema | null>>;
} {
  const schema = signal<DatasetSchema | null>(
    options.schema === undefined
      ? schemaOf(options.columns ?? [column('a'), column('b', 'int')])
      : options.schema,
  );
  return {
    schemaSignal: schema,
    schema: schema as Signal<DatasetSchema | null>,
    catalogue: signal(options.catalogue === undefined ? CATALOGUE : options.catalogue),
    columns: options.scope ? signal(options.scope) : undefined,
    tolerantColumns: options.tolerant ? signal(new Set(options.tolerant)) : undefined,
    ownerId: 'owner',
    widgetId: options.widgetId,
  };
}

export const condition = (
  columnId: string,
  operator: FilterCondition['operator'] = 'equals',
  values: string[] = [],
  enabled?: boolean,
): FilterCondition => ({
  kind: 'condition',
  columnId,
  operator,
  values,
  ...(enabled === undefined ? {} : { enabled }),
});

export const groupOf = (join: 'and' | 'or', ...children: FilterGroup['children']): FilterGroup => ({
  kind: 'group',
  join,
  children,
});
