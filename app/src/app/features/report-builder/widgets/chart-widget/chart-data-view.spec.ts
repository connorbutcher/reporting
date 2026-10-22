import { describe, expect, it } from 'vitest';
import { ChartWidgetConfig } from '../../../../core/models/report';
import { BarChartQueryResult } from '../../../../core/models/widget-query';
import { ChartDataView } from './chart-data-view';

describe('ChartDataView', () => {
  it('formats a bar chart’s values as text and caps the rows', () => {
    const categories = Array.from({ length: 502 }, (_, i) => `C${i}`);
    const data: BarChartQueryResult = {
      id: '1',
      name: 'D',
      categories,
      series: [{ label: 'Sales', bindingId: 'Sales', values: categories.map(() => 1234.5) }],
      toleranceBands: [],
      totalRowCount: 502,
      matchedRowCount: 502,
    };

    const table = ChartDataView.build({ type: 'barChart' } as ChartWidgetConfig, data, []);

    expect(table.header).toEqual(['Category', 'Sales']);
    expect(table.rows[0]).toEqual(['C0', '1,234.5']);
    expect(table.rows.length).toBe(500);
    expect(table.hidden).toBe(2);
  });

  it('shows booleans as Yes and No', () => {
    expect(ChartDataView.cellText(true)).toBe('Yes');
    expect(ChartDataView.cellText(false)).toBe('No');
  });
});
