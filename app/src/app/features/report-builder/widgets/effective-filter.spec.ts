import { describe, expect, it } from 'vitest';
import { FilterGroup } from '../../../core/models/filter';
import { EffectiveFilter } from './effective-filter';

const group = (columnId: string): FilterGroup => ({
  kind: 'group',
  join: 'and',
  children: [{ kind: 'condition', columnId, operator: 'equals', values: ['1'] }],
});

describe('resolveWidgetFilter', () => {
  const report = group('report');
  const config = group('config');
  const override = group('override');

  it('layers the widget’s saved filter under the report’s when the host supplies none', () => {
    expect(EffectiveFilter.resolve(report, undefined, config)).toEqual({
      kind: 'group',
      join: 'and',
      children: [report, config],
    });
  });

  it('lets a host-supplied filter win over the saved one', () => {
    const resolved = EffectiveFilter.resolve(report, override, config);

    expect(resolved?.children).toEqual([report, override]);
  });

  it('lets a host-supplied null drop the widget’s own filter, keeping the report’s', () => {
    expect(EffectiveFilter.resolve(report, null, config)?.children).toEqual([report]);
  });

  it('is null when there is nothing to apply', () => {
    expect(EffectiveFilter.resolve(null, undefined, null)).toBeNull();
    expect(EffectiveFilter.resolve(null, null, config)).toBeNull();
  });
});
