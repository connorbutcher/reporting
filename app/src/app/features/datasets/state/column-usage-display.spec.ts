import { describe, expect, it } from 'vitest';
import { ColumnUse } from '../../../core/models/dataset';
import { ColumnUsageDisplay } from './column-usage-display';

const widget = (over: Partial<ColumnUse> = {}): ColumnUse => ({
  kind: 'widget',
  widgetId: 'w1',
  widgetTitle: 'Sales log',
  widgetType: 'dataTable',
  tabName: 'Overview',
  roles: ['Table column', 'Filter condition ×2'],
  ...over,
});
const filter: ColumnUse = {
  kind: 'reportFilter',
  widgetId: null,
  widgetTitle: null,
  widgetType: null,
  tabName: null,
  roles: ['Filter condition'],
};

describe('describeUse', () => {
  it('names a widget by its title, with its kind and tab, and how it uses the column', () => {
    expect(ColumnUsageDisplay.describe(widget())).toMatchObject({
      widgetId: 'w1',
      name: 'Sales log',
      roles: 'Table column, Filter condition ×2',
    });
    expect(ColumnUsageDisplay.describe(widget()).where).toContain('Overview');
  });

  it('falls back to the widget type when it has no title', () => {
    expect(ColumnUsageDisplay.describe(widget({ widgetTitle: '  ' })).name).toMatch(/^Untitled /);
    expect(ColumnUsageDisplay.describe(widget({ widgetTitle: null })).name).toMatch(/^Untitled /);
  });

  it('describes the page-level filter, which has no widget to open', () => {
    expect(ColumnUsageDisplay.describe(filter)).toEqual({
      widgetId: null,
      name: 'Report filter',
      where: '',
      roles: 'Filter condition',
      icon: 'pi pi-filter',
    });
  });
});

describe('summariseUses', () => {
  it('counts widgets and mentions the report filter', () => {
    expect(ColumnUsageDisplay.summarise([widget(), widget({ widgetId: 'w2' })])).toBe(
      'Used in 2 widgets',
    );
    expect(ColumnUsageDisplay.summarise([widget()])).toBe('Used in 1 widget');
    expect(ColumnUsageDisplay.summarise([widget(), filter])).toBe(
      'Used in 1 widget and the report filter',
    );
    expect(ColumnUsageDisplay.summarise([filter])).toBe('Used in the report filter');
    expect(ColumnUsageDisplay.summarise([])).toBe('Not used');
  });
});

describe('useDetails', () => {
  it('gives one readable line per use', () => {
    const lines = ColumnUsageDisplay.details([widget(), filter]);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Sales log');
    expect(lines[0]).toContain('Overview');
    expect(lines[0]).toContain('Table column, Filter condition ×2');
    expect(lines[1]).toBe('Report filter — Filter condition');
  });
});
