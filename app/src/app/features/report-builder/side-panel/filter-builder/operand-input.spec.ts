import { describe, expect, it } from 'vitest';
import { OperatorDescriptor } from '../../../../core/models/filter';
import { OperandInput } from './operand-input';

const descriptor = (
  operandKind: OperatorDescriptor['operandKind'],
  operandCount = 1,
): OperatorDescriptor => ({ value: 'equals', label: 'is', operandKind, operandCount });

describe('usesValueList', () => {
  it('is true for equals, notEquals and in on a text column', () => {
    expect(OperandInput.usesValueList('string', 'equals')).toBe(true);
    expect(OperandInput.usesValueList('string', 'notEquals')).toBe(true);
    expect(OperandInput.usesValueList('string', 'in')).toBe(true);
  });

  it('is false for other text operators and for other column types', () => {
    expect(OperandInput.usesValueList('string', 'contains')).toBe(false);
    expect(OperandInput.usesValueList('string', 'isEmpty')).toBe(false);
    expect(OperandInput.usesValueList('int', 'equals')).toBe(false);
    expect(OperandInput.usesValueList(undefined, 'equals')).toBe(false);
  });
});

describe('operandInputType', () => {
  it('matches the operand kind, defaulting to text', () => {
    expect(OperandInput.inputType(descriptor('number'))).toBe('number');
    expect(OperandInput.inputType(descriptor('date'))).toBe('date');
    expect(OperandInput.inputType(descriptor('text'))).toBe('text');
    expect(OperandInput.inputType(descriptor('list'))).toBe('text');
    expect(OperandInput.inputType(null)).toBe('text');
  });
});

describe('operandPlaceholder', () => {
  it('hints a list, labels a range from/to, and otherwise says value', () => {
    expect(OperandInput.placeholder(descriptor('list'), 0)).toBe('value, value, …');
    expect(OperandInput.placeholder(descriptor('number', 2), 0)).toBe('from');
    expect(OperandInput.placeholder(descriptor('number', 2), 1)).toBe('to');
    expect(OperandInput.placeholder(descriptor('text'), 0)).toBe('value');
    expect(OperandInput.placeholder(null, 0)).toBe('value');
  });
});

describe('operandDisplayValue', () => {
  it('leaves non-date operands as they are', () => {
    expect(OperandInput.displayValue(descriptor('text'), '2026-03-04T10:00:00Z')).toBe(
      '2026-03-04T10:00:00Z',
    );
    expect(OperandInput.displayValue(null, 'x')).toBe('x');
  });

  it('shows a stored ISO date as yyyy-MM-dd', () => {
    expect(OperandInput.displayValue(descriptor('date'), '2026-03-04T10:00:00.000Z')).toBe(
      '2026-03-04',
    );
  });

  it('keeps a blank or unparseable date as typed', () => {
    expect(OperandInput.displayValue(descriptor('date'), '')).toBe('');
    expect(OperandInput.displayValue(descriptor('date'), 'soon')).toBe('soon');
  });
});
