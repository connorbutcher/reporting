import { describe, expect, it } from 'vitest';
import { OperatorDescriptor } from '../../../../core/models/filter';
import {
  operandDisplayValue,
  operandInputType,
  operandPlaceholder,
  usesValueList,
} from './operand-input';

const descriptor = (
  operandKind: OperatorDescriptor['operandKind'],
  operandCount = 1,
): OperatorDescriptor => ({ value: 'equals', label: 'is', operandKind, operandCount });

describe('usesValueList', () => {
  it('is true for equals, notEquals and in on a text column', () => {
    expect(usesValueList('string', 'equals')).toBe(true);
    expect(usesValueList('string', 'notEquals')).toBe(true);
    expect(usesValueList('string', 'in')).toBe(true);
  });

  it('is false for other text operators and for other column types', () => {
    expect(usesValueList('string', 'contains')).toBe(false);
    expect(usesValueList('string', 'isEmpty')).toBe(false);
    expect(usesValueList('int', 'equals')).toBe(false);
    expect(usesValueList(undefined, 'equals')).toBe(false);
  });
});

describe('operandInputType', () => {
  it('matches the operand kind, defaulting to text', () => {
    expect(operandInputType(descriptor('number'))).toBe('number');
    expect(operandInputType(descriptor('date'))).toBe('date');
    expect(operandInputType(descriptor('text'))).toBe('text');
    expect(operandInputType(descriptor('list'))).toBe('text');
    expect(operandInputType(null)).toBe('text');
  });
});

describe('operandPlaceholder', () => {
  it('hints a list, labels a range from/to, and otherwise says value', () => {
    expect(operandPlaceholder(descriptor('list'), 0)).toBe('value, value, …');
    expect(operandPlaceholder(descriptor('number', 2), 0)).toBe('from');
    expect(operandPlaceholder(descriptor('number', 2), 1)).toBe('to');
    expect(operandPlaceholder(descriptor('text'), 0)).toBe('value');
    expect(operandPlaceholder(null, 0)).toBe('value');
  });
});

describe('operandDisplayValue', () => {
  it('leaves non-date operands as they are', () => {
    expect(operandDisplayValue(descriptor('text'), '2026-03-04T10:00:00Z')).toBe('2026-03-04T10:00:00Z');
    expect(operandDisplayValue(null, 'x')).toBe('x');
  });

  it('shows a stored ISO date as yyyy-MM-dd', () => {
    expect(operandDisplayValue(descriptor('date'), '2026-03-04T10:00:00.000Z')).toBe('2026-03-04');
  });

  it('keeps a blank or unparseable date as typed', () => {
    expect(operandDisplayValue(descriptor('date'), '')).toBe('');
    expect(operandDisplayValue(descriptor('date'), 'soon')).toBe('soon');
  });
});
