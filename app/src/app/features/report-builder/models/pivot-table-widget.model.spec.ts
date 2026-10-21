import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import { DEFAULT_PIVOT_CONFIG, PivotTableWidget } from '../../../core/models/report';
import { PivotTableWidgetModel } from './pivot-table-widget.model';

const col = (id: string, name: string, type: DatasetColumn['type'] = 'string'): DatasetColumn =>
  ({ id, name, type, order: 0, configuration: {} }) as DatasetColumn;

const data = {
  id: 1,
  name: 'Parts',
  columns: [
    col('supplier', 'Supplier'),
    col('made', 'Made', 'dateTime'),
    col('cost', 'Cost', 'double'),
  ],
} as unknown as DatasetSchema;

function pivot(config: Partial<PivotTableWidget['config']> = {}): PivotTableWidgetModel {
  const widget: PivotTableWidget = {
    id: 'p1',
    x: 0,
    y: 0,
    w: 6,
    h: 4,
    type: 'pivotTable',
    config: { ...DEFAULT_PIVOT_CONFIG, type: 'pivotTable', datasetId: 1, ...config },
  };
  return new PivotTableWidgetModel(widget, {
    schemas: signal({ 1: data }),
    catalogue: signal(null),
  });
}

describe('PivotTableWidgetModel', () => {
  it('round-trips column fields, date groupings, subtotals and measure options', () => {
    const model = pivot({
      rowFields: ['supplier'],
      columnFields: ['made'],
      fieldGroupings: [{ columnId: 'made', grouping: 'month' }],
      showSubtotals: true,
      measures: [
        {
          id: 'm1',
          columnId: 'cost',
          aggregate: 'median',
          label: '',
          showAs: 'percentOfTotal',
          dataBars: true,
          formatRules: [{ operator: 'greaterThan', value: '5', style: 'red' }],
        },
      ],
    });

    const config = model.toDto().config;

    expect(config.columnFields).toEqual(['made']);
    expect(config.fieldGroupings).toEqual([{ columnId: 'made', grouping: 'month' }]);
    expect(config.showSubtotals).toBe(true);
    expect(config.measures[0]).toMatchObject({
      aggregate: 'median',
      showAs: 'percentOfTotal',
      dataBars: true,
    });
    expect(model.issues()).toEqual([]);
  });

  it('keeps a field on one axis only, and drops its grouping when it is removed', () => {
    const model = pivot();
    model.addRowField('made');
    model.addColumnField('made');
    model.setFieldGrouping('made', 'year');

    expect(model.columnFields()).toEqual([]);
    expect(model.availableColumnFields().map((c) => c.id)).toEqual(['supplier', 'cost']);

    model.removeRowField('made');
    expect(model.fieldGroupings()).toEqual([]);
  });

  it('keeps a text column for a distinct count but not for a numeric aggregate', () => {
    const model = pivot({
      measures: [{ id: 'm1', columnId: null, aggregate: 'count', label: '' }],
    });
    model.setMeasureAggregate('m1', 'countDistinct');
    model.updateMeasure('m1', { columnId: 'supplier' });

    model.setMeasureAggregate('m1', 'countDistinct');
    expect(model.measures()[0].columnId).toBe('supplier');

    model.setMeasureAggregate('m1', 'sum');
    expect(model.measures()[0].columnId).toBeNull();
  });

  it('flags a column field whose column was removed from the dataset', () => {
    const model = pivot({
      columnFields: ['gone'],
      measures: [{ id: 'm1', columnId: null, aggregate: 'count', label: '' }],
    });

    expect(model.issues().map((i) => i.id)).toContain('p1:missingRowField');
  });
});
