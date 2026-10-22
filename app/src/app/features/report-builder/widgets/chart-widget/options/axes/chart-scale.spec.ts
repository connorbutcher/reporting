import { describe, expect, it } from 'vitest';
import { ChartScale } from './chart-scale';

describe('ChartScale.autoCategoryRotate', () => {
  it('leaves a few short labels flat', () => {
    expect(ChartScale.autoCategoryRotate(['I4', 'I6', 'V8', 'V12'], false)).toBe(0);
  });

  it('tilts a few labels too long to sit side by side', () => {
    const inspectors = ['A. Whitfield', 'M. Lindqvist', 'R. Okafor', 'S. Bhandari'];

    expect(ChartScale.autoCategoryRotate(inspectors, false)).toBe(30);
    expect(ChartScale.autoCategoryRotate(inspectors, true)).toBe(0);
  });

  it('tilts a long list', () => {
    expect(ChartScale.autoCategoryRotate(['a', 'b', 'c', 'd', 'e', 'f', 'g'], false)).toBe(30);
  });
});

describe('ChartScale.numericAxis', () => {
  it('formats ticks without padding zeros and hides labels that would collide', () => {
    const axis = ChartScale.numericAxis(false, null, null, null, {
      kind: 'numeric',
      decimals: 4,
      suffix: ' mm',
    });

    expect(axis.axisLabel?.formatter?.(0.07)).toBe('0.07 mm');
    expect(axis.axisLabel?.hideOverlap).toBe(true);
  });
});
