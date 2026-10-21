import { describe, expect, it } from 'vitest';
import { FilterCondition } from '../../../../core/models/filter';
import { FilterConditionModel } from './filter-condition.model';
import { FilterFixtures } from './testing/filter-fixtures';

const build = (
  dto: FilterCondition,
  options: Parameters<typeof FilterFixtures.contextOf>[0] = {},
) => new FilterConditionModel(dto, FilterFixtures.contextOf(options));

describe('FilterConditionModel', () => {
  describe('construction', () => {
    it('copies the dto, treating a missing enabled flag as enabled', () => {
      const values = ['x'];
      const model = build(FilterFixtures.condition('a', 'equals', values));

      expect(model.columnId()).toBe('a');
      expect(model.operator()).toBe('equals');
      expect(model.values()).toEqual(['x']);
      expect(model.enabled()).toBe(true);
      expect(model.values()).not.toBe(values);
    });

    it('reads enabled: false', () => {
      expect(build(FilterFixtures.condition('a', 'equals', [], false)).enabled()).toBe(false);
    });
  });

  describe('operators', () => {
    it('offers none until the schema and catalogue are in', () => {
      expect(build(FilterFixtures.condition('a'), { schema: null }).availableOperators()).toEqual(
        [],
      );
      expect(
        build(FilterFixtures.condition('a'), { catalogue: null }).availableOperators(),
      ).toEqual([]);
    });

    it('offers the operators for the column’s type', () => {
      const model = build(FilterFixtures.condition('a'));

      expect(model.availableOperators().map((o) => o.value)).toEqual([
        'equals',
        'notEquals',
        'in',
        'isEmpty',
      ]);
    });

    it('hides tolerance operators unless the column has banding', () => {
      const plain = build(FilterFixtures.condition('b', 'equals'));
      const banded = build(FilterFixtures.condition('b', 'equals'), { tolerant: ['b'] });

      expect(plain.availableOperators().map((o) => o.value)).toEqual(['equals', 'between']);
      expect(banded.availableOperators().map((o) => o.value)).toEqual([
        'equals',
        'between',
        'inTolerance',
        'outOfTolerance',
      ]);
      expect(plain.isTolerant()).toBe(false);
      expect(banded.isTolerant()).toBe(true);
    });

    it('keeps an orphaned tolerance operator that is currently selected', () => {
      const model = build(FilterFixtures.condition('b', 'inTolerance'));

      expect(model.availableOperators().map((o) => o.value)).toEqual([
        'equals',
        'between',
        'inTolerance',
      ]);
      expect(model.descriptor()?.value).toBe('inTolerance');
    });

    it('describes the chosen operator, and how many operand slots it needs', () => {
      expect(build(FilterFixtures.condition('a', 'equals')).operandIndexes()).toEqual([0]);
      expect(build(FilterFixtures.condition('b', 'between')).operandIndexes()).toEqual([0, 1]);
      expect(build(FilterFixtures.condition('a', 'isEmpty')).operandIndexes()).toEqual([]);
    });
  });

  describe('editing', () => {
    it('switching column keeps a valid operator but clears the values', () => {
      const model = build(FilterFixtures.condition('a', 'equals', ['x']));

      model.setColumn('a2');

      expect(model.columnId()).toBe('a2');
      expect(model.values()).toEqual([]);
    });

    it('switching to a type that lacks the operator falls back to its first', () => {
      const ctx = FilterFixtures.contextOf({
        columns: [
          FilterFixtures.column('a'),
          FilterFixtures.column('b', 'int'),
          FilterFixtures.column('c', 'bool'),
        ],
      });
      const model = new FilterConditionModel(
        FilterFixtures.condition('a', 'notEquals', ['x']),
        ctx,
      );

      model.setColumn('c');

      expect(model.operator()).toBe('isTrue');
    });

    it('does nothing when the column is unchanged', () => {
      const model = build(FilterFixtures.condition('a', 'equals', ['x']));

      model.setColumn('a');

      expect(model.values()).toEqual(['x']);
    });

    it('changing operator keeps only the operands that still fit', () => {
      const model = build(FilterFixtures.condition('b', 'between', ['1', '2']));

      model.setOperator('equals');
      expect(model.values()).toEqual(['1']);

      model.setOperator('inTolerance');
      expect(model.values()).toEqual([]);
    });

    it('setValue pads with blanks up to the index', () => {
      const model = build(FilterFixtures.condition('b', 'between'));

      model.setValue(1, 'to');

      expect(model.values()).toEqual(['', 'to']);
    });

    it('setValues replaces every operand with a copy', () => {
      const model = build(FilterFixtures.condition('a', 'in'));
      const next = ['a', 'b'];

      model.setValues(next);

      expect(model.values()).toEqual(['a', 'b']);
      expect(model.values()).not.toBe(next);
    });

    it('toggles enabled', () => {
      const model = build(FilterFixtures.condition('a'));

      model.setEnabled(false);

      expect(model.enabled()).toBe(false);
    });
  });

  describe('completeness', () => {
    it('needs as many non-blank operands as the operator takes', () => {
      expect(build(FilterFixtures.condition('a', 'equals', [])).isComplete()).toBe(false);
      expect(build(FilterFixtures.condition('a', 'equals', ['  '])).isComplete()).toBe(false);
      expect(build(FilterFixtures.condition('a', 'equals', ['x'])).isComplete()).toBe(true);
      expect(build(FilterFixtures.condition('b', 'between', ['1'])).isComplete()).toBe(false);
      expect(build(FilterFixtures.condition('b', 'between', ['1', '2'])).isComplete()).toBe(true);
      expect(build(FilterFixtures.condition('a', 'isEmpty')).isComplete()).toBe(true);
    });

    it('reads as complete while the operators are unknown, so a pending schema drops nothing', () => {
      expect(build(FilterFixtures.condition('a', 'equals'), { schema: null }).isComplete()).toBe(
        true,
      );
    });
  });

  describe('a removed column', () => {
    it('is missing only once the schema has loaded without it', () => {
      expect(build(FilterFixtures.condition('gone'), { schema: null }).columnMissing()).toBe(false);
      expect(build(FilterFixtures.condition('gone')).columnMissing()).toBe(true);
      expect(build(FilterFixtures.condition('a')).columnMissing()).toBe(false);
    });

    it('becomes missing when the schema arrives lacking the column', () => {
      const ctx = FilterFixtures.contextOf({ schema: null });
      const model = new FilterConditionModel(FilterFixtures.condition('gone'), ctx);
      expect(model.columnMissing()).toBe(false);

      ctx.schemaSignal.set(FilterFixtures.schemaOf([FilterFixtures.column('a')]));

      expect(model.columnMissing()).toBe(true);
    });
  });

  describe('problem (the inline cue)', () => {
    it('is null for a healthy condition and for a disabled one', () => {
      expect(build(FilterFixtures.condition('a', 'equals', ['x'])).problem()).toBeNull();
      expect(build(FilterFixtures.condition('gone', 'equals', [], false)).problem()).toBeNull();
    });

    it('flags a missing column as an error', () => {
      expect(build(FilterFixtures.condition('gone', 'equals', ['x'])).problem()).toEqual({
        severity: 'error',
        message: 'This column no longer exists.',
      });
    });

    it('warns about a tolerance operator on a column without banding', () => {
      expect(build(FilterFixtures.condition('b', 'inTolerance')).problem()).toEqual({
        severity: 'warning',
        message: 'No tolerance banding here, so nothing matches.',
      });
      expect(
        build(FilterFixtures.condition('b', 'inTolerance'), { tolerant: ['b'] }).problem(),
      ).toBeNull();
    });

    it('asks for the missing value, or both values for a range', () => {
      expect(build(FilterFixtures.condition('a', 'equals')).problem()).toEqual({
        severity: 'error',
        message: 'Enter a value.',
      });
      expect(build(FilterFixtures.condition('b', 'between', ['1'])).problem()).toEqual({
        severity: 'error',
        message: 'Enter both values.',
      });
    });

    it('reports the column first when several things are wrong', () => {
      expect(build(FilterFixtures.condition('gone', 'inTolerance')).problem()?.message).toBe(
        'This column no longer exists.',
      );
    });
  });

  describe('issues (the Issues panel)', () => {
    it('has none for a healthy or disabled condition', () => {
      expect(build(FilterFixtures.condition('a', 'equals', ['x'])).ownIssues()).toEqual([]);
      expect(build(FilterFixtures.condition('gone', 'equals', [], false)).ownIssues()).toEqual([]);
    });

    it('raises a missing column as an error, and stops there', () => {
      const [issue, ...rest] = build(FilterFixtures.condition('gone', 'inTolerance'), {
        widgetId: 'w1',
      }).ownIssues();

      expect(rest).toEqual([]);
      expect(issue).toMatchObject({
        id: 'owner:filter:gone:inTolerance:missingColumn',
        severity: 'error',
        title: 'A filter points at a column that no longer exists',
        widgetId: 'w1',
        view: { kind: 'root' },
      });
    });

    it('raises missing banding as a warning naming the column', () => {
      const [issue] = build(FilterFixtures.condition('b', 'inTolerance')).ownIssues();

      expect(issue).toMatchObject({
        id: 'owner:filter:b:inTolerance:missingTolerance',
        severity: 'warning',
        title: 'Tolerance filter on "b" has no banding',
      });
    });

    it('raises a missing value as an error saying how many are needed', () => {
      const [one] = build(FilterFixtures.condition('a', 'equals')).ownIssues();
      const [two] = build(FilterFixtures.condition('b', 'between', ['1'])).ownIssues();

      expect(one).toMatchObject({
        id: 'owner:filter:a:equals:missingValue',
        severity: 'error',
        title: 'Filter on "a" is missing a value',
        detail: '"equals" needs 1 value.',
      });
      expect(two.detail).toBe('"between" needs 2 values.');
    });

    it('uses the context’s panel view when it has one', () => {
      const ctx = FilterFixtures.contextOf();
      const withView = { ...ctx, view: { kind: 'widget', widgetId: 'w9' } as const };

      const [issue] = new FilterConditionModel(
        FilterFixtures.condition('a', 'equals'),
        withView,
      ).ownIssues();

      expect(issue.view).toEqual({ kind: 'widget', widgetId: 'w9' });
    });
  });

  describe('toDto', () => {
    it('omits enabled when on, so the dto stays stable for the common case', () => {
      expect(build(FilterFixtures.condition('a', 'equals', ['x'])).toDto()).toEqual({
        kind: 'condition',
        columnId: 'a',
        operator: 'equals',
        values: ['x'],
      });
    });

    it('writes enabled: false when off', () => {
      expect(build(FilterFixtures.condition('a', 'equals', ['x'], false)).toDto()).toMatchObject({
        enabled: false,
      });
    });

    it('returns a copy of the values', () => {
      const model = build(FilterFixtures.condition('a', 'equals', ['x']));

      expect(model.toDto().values).not.toBe(model.values());
    });
  });
});
