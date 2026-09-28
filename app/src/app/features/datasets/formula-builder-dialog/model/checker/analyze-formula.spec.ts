import { describe, expect, it } from 'vitest';
import { functionBlock, groupBlock } from '../factory/item-factory';
import { SCOPE } from '../testing/test-catalogue';
import { call, col, lit, op } from '../testing/test-items';
import { analyzeFormula, checkFormula } from './analyze-formula';

describe('analyzeFormula', () => {
  it('finds nothing wrong with a sound formula, however it was laid out', () => {
    const formula = [call('ROUND', [col('Qty'), op('*'), col('Price'), op('+'), lit(1)], [lit(2)])];
    expect(checkFormula(formula, SCOPE)).toEqual([]);
  });

  it('reports an empty required argument on the function, with its argument, and not an empty optional one', () => {
    const round = call('ROUND', [], []);
    const issues = checkFormula([round], SCOPE);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'missing', blockId: round.id, ownerId: round.id, arg: 0 });
    expect(issues[0].message).toContain('number');
  });

  it('reports an argument of the wrong kind on the value, and on the argument', () => {
    const region = col('Region');
    const round = call('ROUND', [region], []);
    const [issue] = checkFormula([round], SCOPE);

    expect(issue).toMatchObject({ kind: 'type', blockId: region.id, ownerId: round.id, arg: 0 });
    expect(issue.message).toBe('Number needs a number, but this is text.');
  });

  it('checks the kinds of what an operator sits between, from the stack', () => {
    const region = col('Region');
    const issues = checkFormula([region, op('*'), lit(2)], SCOPE);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'type', blockId: region.id });
    expect(issues[0].message).toBe('× needs a number, but this is text.');
  });

  it('checks an operator against the value that comes out of its neighbours, not only what is beside it', () => {
    // (Region & "x") is text, so multiplying it is wrong even though the group holds no number-typed item.
    const group = groupBlock([col('Region'), op('&'), lit('x')]);
    const issues = checkFormula([group, op('*'), lit(2)], SCOPE);
    expect(issues.map((i) => i.kind)).toEqual(['type']);
    expect(issues[0].blockId).toBe(group.id);
    // Without the brackets & binds looser than *, so this is Region & ("x" * 2): the multiplication is the wrong part.
    expect(checkFormula([col('Region'), op('&'), lit('x'), op('*'), lit(2)], SCOPE).map((i) => i.kind)).toEqual(['type']);
  });

  it('lets a comparison take any kind on both sides, but not two different kinds', () => {
    expect(checkFormula([col('Region'), op('='), lit('North')], SCOPE)).toEqual([]);
    const issues = checkFormula([col('Qty'), op('='), lit('x')], SCOPE);
    expect(issues[0].message).toBe("Can't compare a number with text.");
  });

  it('needs true/false around AND and OR, and after NOT', () => {
    expect(checkFormula([col('Shipped'), op('AND'), col('Shipped')], SCOPE)).toEqual([]);
    expect(checkFormula([col('Qty'), op('AND'), col('Shipped')], SCOPE).map((i) => i.kind)).toEqual(['type']);
    expect(checkFormula([op('NOT'), col('Qty')], SCOPE).map((i) => i.kind)).toEqual(['type']);
  });

  it('carries the sequence problems found by the conversion, on the item they are about', () => {
    const plus = op('+');
    const issues = checkFormula([col('Qty'), plus], SCOPE);
    expect(issues).toEqual([{ kind: 'structure', blockId: plus.id, message: '+ needs a value after it.' }]);
  });

  it('checks inside brackets and function arguments, and rejects empty brackets', () => {
    const group = groupBlock([]);
    expect(checkFormula([group], SCOPE).map((i) => i.message)).toEqual(['These brackets are empty.']);
    expect(checkFormula([groupBlock([col('Region'), op('*'), lit(2)])], SCOPE).map((i) => i.kind)).toEqual(['type']);
  });

  it('reports an unknown column and an unknown function', () => {
    const issues = checkFormula([functionBlock(undefined, 'NOPE', [[col('Gone')]])], SCOPE);
    expect(issues.map((i) => i.kind)).toEqual(['unknown', 'unknown']);
    expect(issues[0].message).toContain('NOPE');
    expect(issues[1].message).toContain('[Gone]');
  });

  it('asks for a repeating parameter once, not for its spare argument', () => {
    const issues = checkFormula([call('SUM', [], [])], SCOPE);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'missing', arg: 0 });
  });

  it('accepts a blank literal for any kind', () => {
    expect(checkFormula([call('ROUND', [lit(null)], [])], SCOPE)).toEqual([]);
  });

  it('says nothing about an empty formula', () => {
    expect(analyzeFormula([], SCOPE)).toEqual({ kind: 'any', issues: [] });
  });
});
