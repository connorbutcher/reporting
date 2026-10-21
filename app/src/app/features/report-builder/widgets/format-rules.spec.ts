import { describe, expect, it } from 'vitest';
import { FormatRule } from '../../../core/models/report';
import { FormatRules } from './format-rules/format-rules';

const rule = (over: Partial<FormatRule>): FormatRule => ({
  operator: 'greaterThan',
  value: '',
  style: 'red',
  ...over,
});

describe('format rules', () => {
  it('compares numbers by value', () => {
    expect(FormatRules.ruleMatches(12, rule({ operator: 'greaterThan', value: '10' }))).toBe(true);
    expect(FormatRules.ruleMatches(10, rule({ operator: 'greaterThan', value: '10' }))).toBe(false);
    expect(FormatRules.ruleMatches(10, rule({ operator: 'greaterThanOrEqual', value: '10' }))).toBe(
      true,
    );
    expect(FormatRules.ruleMatches(9, rule({ operator: 'lessThan', value: '10' }))).toBe(true);
    expect(FormatRules.ruleMatches(5, rule({ operator: 'equals', value: '5.0' }))).toBe(true);
  });

  it('treats between as inclusive whichever way round the bounds are given', () => {
    const between = rule({ operator: 'between', value: '10', value2: '5' });
    expect(FormatRules.ruleMatches(5, between)).toBe(true);
    expect(FormatRules.ruleMatches(7, between)).toBe(true);
    expect(FormatRules.ruleMatches(10.5, between)).toBe(false);
  });

  it('compares dates by time', () => {
    expect(
      FormatRules.ruleMatches(
        '2026-03-02T00:00:00',
        rule({ operator: 'greaterThan', value: '2026-03-01' }),
      ),
    ).toBe(true);
    expect(
      FormatRules.ruleMatches(
        '2026-02-02T00:00:00',
        rule({ operator: 'greaterThan', value: '2026-03-01' }),
      ),
    ).toBe(false);
  });

  it('compares text ignoring case, and never orders it', () => {
    expect(
      FormatRules.ruleMatches('Rejected', rule({ operator: 'equals', value: 'rejected' })),
    ).toBe(true);
    expect(
      FormatRules.ruleMatches('Batch rejected', rule({ operator: 'contains', value: 'REJECT' })),
    ).toBe(true);
    expect(FormatRules.ruleMatches('b', rule({ operator: 'greaterThan', value: 'a' }))).toBe(false);
  });

  it('matches blanks only with is empty', () => {
    expect(FormatRules.ruleMatches(null, rule({ operator: 'isEmpty' }))).toBe(true);
    expect(FormatRules.ruleMatches('', rule({ operator: 'isEmpty' }))).toBe(true);
    expect(FormatRules.ruleMatches(0, rule({ operator: 'isEmpty' }))).toBe(false);
    expect(FormatRules.ruleMatches(null, rule({ operator: 'lessThan', value: '1' }))).toBe(false);
  });

  it('ignores a rule whose operand does not parse', () => {
    expect(FormatRules.ruleMatches(5, rule({ operator: 'greaterThan', value: 'abc' }))).toBe(false);
  });

  it('returns the first matching rule’s style', () => {
    const rules: FormatRule[] = [
      rule({ operator: 'greaterThan', value: '100', style: 'red' }),
      rule({ operator: 'greaterThan', value: '50', style: 'amber' }),
    ];
    expect(FormatRules.match(150, rules)).toBe('red');
    expect(FormatRules.match(75, rules)).toBe('amber');
    expect(FormatRules.match(10, rules)).toBeNull();
    expect(FormatRules.match(10, undefined)).toBeNull();
  });

  it('scales data bars from a zero baseline', () => {
    expect(FormatRules.dataBarPercent(50, 10, 100)).toBe(50);
    expect(FormatRules.dataBarPercent(100, 10, 100)).toBe(100);
    expect(FormatRules.dataBarPercent(0, -50, 50)).toBe(50);
    expect(FormatRules.dataBarPercent('x', 0, 10)).toBeNull();
    expect(FormatRules.dataBarPercent(5, 0, 0)).toBeNull();
  });
});
