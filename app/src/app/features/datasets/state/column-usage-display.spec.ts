import { describe, expect, it } from 'vitest';
import { ColumnUse } from '../../../core/models/dataset';
import { describeUse, summariseUses, useDetails } from './column-usage-display';

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
    expect(describeUse(widget())).toMatchObject({
      widgetId: 'w1',
      name: 'Sales log',
      roles: 'Table column, Filter condition ×2',
    });
    expect(describeUse(widget()).where).toContain('Overview');
  });

  it('falls back to the widget type when it has no title', () => {
    expect(describeUse(widget({ widgetTitle: '  ' })).name).toMatch(/^Untitled /);
    expect(describeUse(widget({ widgetTitle: null })).name).toMatch(/^Untitled /);
  });

  it('describes the page-level filter, which has no widget to open', () => {
    expect(describeUse(filter)).toEqual({
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
    expect(summariseUses([widget(), widget({ widgetId: 'w2' })])).toBe('Used in 2 widgets');
    expect(summariseUses([widget()])).toBe('Used in 1 widget');
    expect(summariseUses([widget(), filter])).toBe('Used in 1 widget and the report filter');
    expect(summariseUses([filter])).toBe('Used in the report filter');
    expect(summariseUses([])).toBe('Not used');
  });
});

describe('useDetails', () => {
  it('gives one readable line per use', () => {
    const lines = useDetails([widget(), filter]);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Sales log');
    expect(lines[0]).toContain('Overview');
    expect(lines[0]).toContain('Table column, Filter condition ×2');
    expect(lines[1]).toBe('Report filter — Filter condition');
  });
});
