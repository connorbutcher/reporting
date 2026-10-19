import { describe, expect, it } from 'vitest';
import { FormatRule } from '../../../core/models/report';
import { dataBarPercent, matchFormatRule, ruleMatches } from './format-rules';

const rule = (over: Partial<FormatRule>): FormatRule => ({ operator: 'greaterThan', value: '', style: 'red', ...over });

describe('format rules', () => {
  it('compares numbers by value', () => {
    expect(ruleMatches(12, rule({ operator: 'greaterThan', value: '10' }))).toBe(true);
    expect(ruleMatches(10, rule({ operator: 'greaterThan', value: '10' }))).toBe(false);
    expect(ruleMatches(10, rule({ operator: 'greaterThanOrEqual', value: '10' }))).toBe(true);
    expect(ruleMatches(9, rule({ operator: 'lessThan', value: '10' }))).toBe(true);
    expect(ruleMatches(5, rule({ operator: 'equals', value: '5.0' }))).toBe(true);
  });

  it('treats between as inclusive whichever way round the bounds are given', () => {
    const between = rule({ operator: 'between', value: '10', value2: '5' });
    expect(ruleMatches(5, between)).toBe(true);
    expect(ruleMatches(7, between)).toBe(true);
    expect(ruleMatches(10.5, between)).toBe(false);
  });

  it('compares dates by time', () => {
    expect(ruleMatches('2026-03-02T00:00:00', rule({ operator: 'greaterThan', value: '2026-03-01' }))).toBe(true);
    expect(ruleMatches('2026-02-02T00:00:00', rule({ operator: 'greaterThan', value: '2026-03-01' }))).toBe(false);
  });

  it('compares text ignoring case, and never orders it', () => {
    expect(ruleMatches('Rejected', rule({ operator: 'equals', value: 'rejected' }))).toBe(true);
    expect(ruleMatches('Batch rejected', rule({ operator: 'contains', value: 'REJECT' }))).toBe(true);
    expect(ruleMatches('b', rule({ operator: 'greaterThan', value: 'a' }))).toBe(false);
  });

  it('matches blanks only with is empty', () => {
    expect(ruleMatches(null, rule({ operator: 'isEmpty' }))).toBe(true);
    expect(ruleMatches('', rule({ operator: 'isEmpty' }))).toBe(true);
    expect(ruleMatches(0, rule({ operator: 'isEmpty' }))).toBe(false);
    expect(ruleMatches(null, rule({ operator: 'lessThan', value: '1' }))).toBe(false);
  });

  it('ignores a rule whose operand does not parse', () => {
    expect(ruleMatches(5, rule({ operator: 'greaterThan', value: 'abc' }))).toBe(false);
  });

  it('returns the first matching rule’s style', () => {
    const rules: FormatRule[] = [
      rule({ operator: 'greaterThan', value: '100', style: 'red' }),
      rule({ operator: 'greaterThan', value: '50', style: 'amber' }),
    ];
    expect(matchFormatRule(150, rules)).toBe('red');
    expect(matchFormatRule(75, rules)).toBe('amber');
    expect(matchFormatRule(10, rules)).toBeNull();
    expect(matchFormatRule(10, undefined)).toBeNull();
  });

  it('scales data bars from a zero baseline', () => {
    expect(dataBarPercent(50, 10, 100)).toBe(50);
    expect(dataBarPercent(100, 10, 100)).toBe(100);
    expect(dataBarPercent(0, -50, 50)).toBe(50);
    expect(dataBarPercent('x', 0, 10)).toBeNull();
    expect(dataBarPercent(5, 0, 0)).toBeNull();
  });
});
