import { describe, expect, it } from 'vitest';
import { ItemFactory } from '../factory/item-factory';
import { TestCatalogue } from '../testing/test-catalogue';
import { TestItems } from '../testing/test-items';
import { FormulaChecker } from './formula-checker';

describe('analyzeFormula', () => {
  it('finds nothing wrong with a sound formula, however it was laid out', () => {
    const formula = [
      TestItems.call(
        'ROUND',
        [
          TestItems.col('Qty'),
          TestItems.op('*'),
          TestItems.col('Price'),
          TestItems.op('+'),
          TestItems.lit(1),
        ],
        [TestItems.lit(2)],
      ),
    ];
    expect(FormulaChecker.check(formula, TestCatalogue.SCOPE)).toEqual([]);
  });

  it('reports an empty required argument on the function, with its argument, and not an empty optional one', () => {
    const round = TestItems.call('ROUND', [], []);
    const issues = FormulaChecker.check([round], TestCatalogue.SCOPE);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      kind: 'missing',
      blockId: round.id,
      ownerId: round.id,
      arg: 0,
    });
    expect(issues[0].message).toContain('number');
  });

  it('reports an argument of the wrong kind on the value, and on the argument', () => {
    const region = TestItems.col('Region');
    const round = TestItems.call('ROUND', [region], []);
    const [issue] = FormulaChecker.check([round], TestCatalogue.SCOPE);

    expect(issue).toMatchObject({ kind: 'type', blockId: region.id, ownerId: round.id, arg: 0 });
    expect(issue.message).toBe('Number needs a number, but this is text.');
  });

  it('checks the kinds of what an operator sits between, from the stack', () => {
    const region = TestItems.col('Region');
    const issues = FormulaChecker.check(
      [region, TestItems.op('*'), TestItems.lit(2)],
      TestCatalogue.SCOPE,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'type', blockId: region.id });
    expect(issues[0].message).toBe('× needs a number, but this is text.');
  });

  it('checks an operator against the value that comes out of its neighbours, not only what is beside it', () => {
    // (Region & "x") is text, so multiplying it is wrong even though the group holds no number-typed item.
    const group = ItemFactory.group([
      TestItems.col('Region'),
      TestItems.op('&'),
      TestItems.lit('x'),
    ]);
    const issues = FormulaChecker.check(
      [group, TestItems.op('*'), TestItems.lit(2)],
      TestCatalogue.SCOPE,
    );
    expect(issues.map((i) => i.kind)).toEqual(['type']);
    expect(issues[0].blockId).toBe(group.id);
    // Without the brackets & binds looser than *, so this is Region & ("x" * 2): the multiplication is the wrong part.
    expect(
      FormulaChecker.check(
        [
          TestItems.col('Region'),
          TestItems.op('&'),
          TestItems.lit('x'),
          TestItems.op('*'),
          TestItems.lit(2),
        ],
        TestCatalogue.SCOPE,
      ).map((i) => i.kind),
    ).toEqual(['type']);
  });

  it('lets a comparison take any kind on both sides, but not two different kinds', () => {
    expect(
      FormulaChecker.check(
        [TestItems.col('Region'), TestItems.op('='), TestItems.lit('North')],
        TestCatalogue.SCOPE,
      ),
    ).toEqual([]);
    const issues = FormulaChecker.check(
      [TestItems.col('Qty'), TestItems.op('='), TestItems.lit('x')],
      TestCatalogue.SCOPE,
    );
    expect(issues[0].message).toBe("Can't compare a number with text.");
  });

  it('needs true/false around AND and OR, and after NOT', () => {
    expect(
      FormulaChecker.check(
        [TestItems.col('Shipped'), TestItems.op('AND'), TestItems.col('Shipped')],
        TestCatalogue.SCOPE,
      ),
    ).toEqual([]);
    expect(
      FormulaChecker.check(
        [TestItems.col('Qty'), TestItems.op('AND'), TestItems.col('Shipped')],
        TestCatalogue.SCOPE,
      ).map((i) => i.kind),
    ).toEqual(['type']);
    expect(
      FormulaChecker.check([TestItems.op('NOT'), TestItems.col('Qty')], TestCatalogue.SCOPE).map(
        (i) => i.kind,
      ),
    ).toEqual(['type']);
  });

  it('carries the sequence problems found by the conversion, on the item they are about', () => {
    const plus = TestItems.op('+');
    const issues = FormulaChecker.check([TestItems.col('Qty'), plus], TestCatalogue.SCOPE);
    expect(issues).toEqual([
      { kind: 'structure', blockId: plus.id, message: '+ needs a value after it.' },
    ]);
  });

  it('checks inside brackets and function arguments, and rejects empty brackets', () => {
    const group = ItemFactory.group([]);
    expect(FormulaChecker.check([group], TestCatalogue.SCOPE).map((i) => i.message)).toEqual([
      'These brackets are empty.',
    ]);
    expect(
      FormulaChecker.check(
        [ItemFactory.group([TestItems.col('Region'), TestItems.op('*'), TestItems.lit(2)])],
        TestCatalogue.SCOPE,
      ).map((i) => i.kind),
    ).toEqual(['type']);
  });

  it('reports an unknown column and an unknown function', () => {
    const issues = FormulaChecker.check(
      [ItemFactory.function(undefined, 'NOPE', [[TestItems.col('Gone')]])],
      TestCatalogue.SCOPE,
    );
    expect(issues.map((i) => i.kind)).toEqual(['unknown', 'unknown']);
    expect(issues[0].message).toContain('NOPE');
    expect(issues[1].message).toContain('[Gone]');
  });

  it('asks for a repeating parameter once, not for its spare argument', () => {
    const issues = FormulaChecker.check([TestItems.call('SUM', [], [])], TestCatalogue.SCOPE);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'missing', arg: 0 });
  });

  it('accepts a blank literal for any kind', () => {
    expect(
      FormulaChecker.check(
        [TestItems.call('ROUND', [TestItems.lit(null)], [])],
        TestCatalogue.SCOPE,
      ),
    ).toEqual([]);
  });

  it('says nothing about an empty formula', () => {
    expect(FormulaChecker.analyze([], TestCatalogue.SCOPE)).toEqual({ kind: 'any', issues: [] });
  });
});
