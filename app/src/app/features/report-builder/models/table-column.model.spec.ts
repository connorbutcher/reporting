import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import { DataTableColumnSetting, ToleranceConfig } from '../../../core/models/report';
import { TableColumnModel } from './table-column.model';

const col = (id: string, name: string, type: DatasetColumn['type'] = 'string'): DatasetColumn =>
  ({ id, name, type, order: 0, configuration: {} }) as DatasetColumn;

const schema = (id: number, name: string, columns: DatasetColumn[]): DatasetSchema =>
  ({ id, name, sourceId: 1, source: 'json', sourceConfig: {}, columns }) as unknown as DatasetSchema;

const data = schema(1, 'Data', [col('part', 'Part'), col('reading', 'Reading', 'double')]);
const limits = schema(2, 'Limits', [
  col('lpart', 'Part'),
  col('min', 'Min', 'double'),
  col('max', 'Max', 'double'),
]);

function columnWith(tolerance: ToleranceConfig, ownSchema: DatasetSchema = data): TableColumnModel {
  const dto: DataTableColumnSetting = { columnId: 'reading', tolerance };
  return new TableColumnModel('w1', dto, signal(ownSchema), signal({ 1: ownSchema, 2: limits }));
}

const matching: ToleranceConfig = {
  sourceDatasetId: 2,
  match: { columnId: 'part', sourceColumnId: 'lpart' },
  minColumnId: 'min',
  maxColumnId: 'max',
};

describe('TableColumnModel tolerance validation', () => {
  it('accepts a per-row match whose columns all still exist, and round-trips it', () => {
    const column = columnWith(matching);

    expect(column.issues()).toEqual([]);
    expect(column.toDto().tolerance).toEqual(matching);
  });

  it('flags a match whose limits-dataset identifier column was removed', () => {
    const column = columnWith({ ...matching, match: { columnId: 'part', sourceColumnId: 'gone' } });

    expect(column.errors().map((e) => e.id)).toEqual(['w1:column:reading:toleranceMissing']);
  });

  it('flags a match whose own-dataset identifier column was removed', () => {
    const column = columnWith({ ...matching, match: { columnId: 'gone', sourceColumnId: 'lpart' } });

    expect(column.errors().map((e) => e.id)).toEqual(['w1:column:reading:toleranceMissing']);
  });

  it('still checks a fixed-row pointer’s bound columns', () => {
    const fixed: ToleranceConfig = { sourceDatasetId: 2, sourceRowId: 'r1', minColumnId: 'min', maxColumnId: 'gone' };

    expect(columnWith(fixed).errors()).toHaveLength(1);
    expect(columnWith({ ...fixed, maxColumnId: 'max' }).errors()).toHaveLength(0);
  });
});
