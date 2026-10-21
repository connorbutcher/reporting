import { describe, expect, it } from 'vitest';
import { FilterGroup } from '../../../../core/models/filter';
import { FilterGroupModel } from './filter-group.model';
import { ReportFilterModel } from './report-filter.model';
import { FilterFixtures } from './testing/filter-fixtures';

const build = (
  dto: FilterGroup | null = null,
  options: Parameters<typeof FilterFixtures.contextOf>[0] = {},
) => new FilterGroupModel(dto, FilterFixtures.contextOf(options));

describe('FilterGroupModel', () => {
  describe('construction', () => {
    it('starts empty, joined by AND, from no dto', () => {
      const model = build();

      expect(model.join()).toBe('and');
      expect(model.count()).toBe(0);
    });

    it('reads the join and conditions from a dto', () => {
      const model = build(
        FilterFixtures.groupOf(
          'or',
          FilterFixtures.condition('a', 'equals', ['x']),
          FilterFixtures.condition('b', 'equals', ['1']),
        ),
      );

      expect(model.join()).toBe('or');
      expect(model.children().map((c) => c.columnId())).toEqual(['a', 'b']);
    });

    it('flattens nested groups to their conditions rather than dropping them', () => {
      const model = build(
        FilterFixtures.groupOf(
          'and',
          FilterFixtures.condition('a', 'equals', ['1']),
          FilterFixtures.groupOf(
            'or',
            FilterFixtures.condition('b', 'equals', ['2']),
            FilterFixtures.groupOf('and', FilterFixtures.condition('c', 'equals', ['3'])),
          ),
        ),
      );

      expect(model.children().map((c) => c.columnId())).toEqual(['a', 'b', 'c']);
    });
  });

  describe('editing', () => {
    it('adds a condition on the first offerable column with that type’s first operator', () => {
      const model = build();

      const added = model.addCondition();

      expect(added?.columnId()).toBe('a');
      expect(added?.operator()).toBe('equals');
      expect(model.count()).toBe(1);
    });

    it('adds on a named column, or nothing when it isn’t offered', () => {
      const model = build();

      expect(model.addCondition('b')?.operator()).toBe('equals');
      expect(model.addCondition('nope')).toBeNull();
      expect(model.count()).toBe(1);
    });

    it('adds nothing while the schema is pending', () => {
      expect(build(null, { schema: null }).addCondition()).toBeNull();
    });

    it('removes by index, and clears', () => {
      const model = build(
        FilterFixtures.groupOf(
          'and',
          FilterFixtures.condition('a'),
          FilterFixtures.condition('b'),
          FilterFixtures.condition('a'),
        ),
      );

      model.removeAt(1);
      expect(model.children().map((c) => c.columnId())).toEqual(['a', 'a']);

      model.clear();
      expect(model.count()).toBe(0);
    });

    it('sets the join', () => {
      const model = build();

      model.setJoin('or');

      expect(model.join()).toBe('or');
    });

    it('replaceWith rebuilds from a dto without sharing its conditions', () => {
      const source = FilterFixtures.groupOf('or', FilterFixtures.condition('a', 'equals', ['x']));
      const model = build(FilterFixtures.groupOf('and', FilterFixtures.condition('b')));

      model.replaceWith(source);
      model.children()[0].setValue(0, 'changed');

      expect(model.join()).toBe('or');
      expect(model.children().map((c) => c.columnId())).toEqual(['a']);
      expect((source.children[0] as { values: string[] }).values).toEqual(['x']);
    });

    it('replaceWith(null) empties it', () => {
      const model = build(FilterFixtures.groupOf('or', FilterFixtures.condition('a')));

      model.replaceWith(null);

      expect(model.count()).toBe(0);
      expect(model.join()).toBe('and');
    });
  });

  describe('columns', () => {
    it('offers the whole schema when nothing narrows it', () => {
      expect(
        build()
          .columns()
          .map((c) => c.id),
      ).toEqual(['a', 'b']);
    });

    it('offers only the scoped columns', () => {
      const scoped = build(null, { scope: [FilterFixtures.column('b', 'int')] });

      expect(scoped.columns().map((c) => c.id)).toEqual(['b']);
    });

    it('still lists a column a condition uses after it left the scope', () => {
      const scoped = build(FilterFixtures.groupOf('and', FilterFixtures.condition('a')), {
        scope: [FilterFixtures.column('b', 'int')],
      });

      expect(scoped.columns().map((c) => c.id)).toEqual(['a', 'b']);
    });

    it('is empty while the schema is pending', () => {
      expect(build(null, { schema: null }).columns()).toEqual([]);
    });
  });

  describe('readiness', () => {
    it('is ready once the schema and catalogue are both in, and names the dataset', () => {
      const ready = build();

      expect(ready.ready()).toBe(true);
      expect(ready.datasetId()).toBe(7);
      expect(build(null, { schema: null }).ready()).toBe(false);
      expect(build(null, { catalogue: null }).ready()).toBe(false);
      expect(build(null, { schema: null }).datasetId()).toBeNull();
    });
  });

  describe('counts', () => {
    it('counts all conditions, the switched-on ones, and those on removed columns', () => {
      const model = build(
        FilterFixtures.groupOf(
          'and',
          FilterFixtures.condition('a', 'equals', ['x']),
          FilterFixtures.condition('a', 'equals', ['y'], false),
          FilterFixtures.condition('gone', 'equals', ['z']),
          FilterFixtures.condition('gone', 'equals', ['z'], false),
        ),
      );

      expect(model.count()).toBe(4);
      expect(model.enabledCount()).toBe(2);
      expect(model.missingColumnCount()).toBe(1);
    });
  });

  describe('projections', () => {
    const mixed = () =>
      build(
        FilterFixtures.groupOf(
          'or',
          FilterFixtures.condition('a', 'equals', ['x']),
          FilterFixtures.condition('a', 'equals', [], undefined),
          FilterFixtures.condition('a', 'equals', ['off'], false),
          FilterFixtures.condition('gone', 'equals', ['z']),
        ),
      );

    it('toDto is null when empty, and keeps every row otherwise', () => {
      expect(build().toDto()).toBeNull();
      expect(mixed().toDto()!.children).toHaveLength(4);
      expect(mixed().toDto()!.join).toBe('or');
    });

    it('toQueryDto keeps only enabled, complete conditions on columns that exist', () => {
      expect(mixed().toQueryDto()).toEqual(
        FilterFixtures.groupOf('or', FilterFixtures.condition('a', 'equals', ['x'])),
      );
    });

    it('toQueryDto is null when nothing qualifies', () => {
      expect(
        build(FilterFixtures.groupOf('and', FilterFixtures.condition('a', 'equals'))).toQueryDto(),
      ).toBeNull();
    });

    it('toCompleteDto keeps every finished condition, enabled or not, missing column or not', () => {
      const values = mixed()
        .toCompleteDto()!
        .children.map((c) => (c as { values: string[] }).values[0]);

      expect(values).toEqual(['x', 'off', 'z']);
    });

    it('toCompleteDto is null when nothing is finished', () => {
      expect(
        build(
          FilterFixtures.groupOf('and', FilterFixtures.condition('a', 'equals')),
        ).toCompleteDto(),
      ).toBeNull();
    });
  });

  describe('as an editor node', () => {
    it('rolls its conditions’ issues up, and raises none of its own', () => {
      const model = build(
        FilterFixtures.groupOf(
          'and',
          FilterFixtures.condition('a', 'equals'),
          FilterFixtures.condition('gone', 'equals', ['x']),
        ),
      );

      expect(model.ownIssues()).toEqual([]);
      expect(model.issues().map((i) => i.id)).toEqual([
        'owner:filter:a:equals:missingValue',
        'owner:filter:gone:equals:missingColumn',
      ]);
    });

    it('snapshots as its dto', () => {
      const model = build(
        FilterFixtures.groupOf('and', FilterFixtures.condition('a', 'equals', ['x'])),
      );

      expect(model.snapshotValue()).toEqual(model.toDto());
    });
  });
});

describe('ReportFilterModel', () => {
  const build = (dto: FilterGroup | null, schemaName = 'Bearings') =>
    new ReportFilterModel(
      7,
      dto,
      FilterFixtures.contextOf({
        schema: FilterFixtures.schemaOf([FilterFixtures.column('a')], 7, schemaName),
      }),
    );

  it('has no dto while its group is empty', () => {
    expect(build(null).toDto()).toBeNull();
  });

  it('carries the dataset id with its filter', () => {
    const filter = FilterFixtures.groupOf('and', FilterFixtures.condition('a', 'equals', ['x']));

    expect(build(filter).toDto()).toEqual({ datasetId: 7, filter });
  });

  it('names its dataset, or says it is unknown while the schema is pending', () => {
    expect(build(null).datasetName()).toBe('Bearings');
    const pending = new ReportFilterModel(7, null, FilterFixtures.contextOf({ schema: null }));
    expect(pending.datasetName()).toBe('Unknown dataset');
  });

  it('rolls its group’s issues up', () => {
    const model = build(FilterFixtures.groupOf('and', FilterFixtures.condition('a', 'equals')));

    expect(model.issues()).toHaveLength(1);
    expect(model.ownIssues()).toEqual([]);
  });
});
