import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { hasFixedLimits } from '../../../core/models/report';
import { NotificationService } from '../../../core/services/notification.service';
import { ToleranceSourcePicker } from './tolerance-source-picker';

function picker(): ToleranceSourcePicker {
  TestBed.configureTestingModule({
    providers: [
      ToleranceSourcePicker,
      { provide: NotificationService, useValue: { loadError: () => undefined } },
      {
        provide: DatasetApiService,
        useValue: {
          getSchema: () => of({ id: 2, name: 'Limits', columns: [] }),
          getData: () => of({ rows: [] }),
        },
      },
    ],
  });
  return TestBed.inject(ToleranceSourcePicker);
}

const limits = { sourceDatasetId: 2, minColumnId: 'min', maxColumnId: 'max' };

describe('ToleranceSourcePicker per-row matching', () => {
  it('is off by default, and then produces the fixed-row pointer', () => {
    const p = picker();
    p.seed({ ...limits, sourceRowId: 'r1' });

    expect(p.matchEnabled()).toBe(false);
    expect(p.isComplete()).toBe(true);
    expect(p.toColumnTolerance()).toEqual({ ...limits, sourceRowId: 'r1' });
  });

  it('once opted in, needs the two match columns instead of a spec row', () => {
    const p = picker();
    p.seed({ ...limits, sourceRowId: 'r1' });
    p.matchEnabled.set(true);

    expect(p.isComplete()).toBe(false);
    expect(p.toColumnTolerance()).toBeNull();

    p.matchColumnId.set('part');
    p.sourceMatchColumnId.set('lpart');

    expect(p.isComplete()).toBe(true);
    // No fixed row travels with a matched tolerance.
    expect(p.toColumnTolerance()).toEqual({ ...limits, match: { columnId: 'part', sourceColumnId: 'lpart' } });
  });

  it('remembers the fixed row while matching is on, so turning it off restores it', () => {
    const p = picker();
    p.seed({ ...limits, sourceRowId: 'r1' });
    p.matchEnabled.set(true);
    p.matchEnabled.set(false);

    expect(p.toColumnTolerance()).toEqual({ ...limits, sourceRowId: 'r1' });
  });

  it('seeds an existing match, and keeps the table-side column when the limits dataset changes', () => {
    const p = picker();
    p.seed({ ...limits, match: { columnId: 'part', sourceColumnId: 'lpart' } });

    expect(p.matchEnabled()).toBe(true);
    expect(p.matchColumnId()).toBe('part');
    expect(p.sourceMatchColumnId()).toBe('lpart');

    p.selectDataset(3);

    // The limits-side column belonged to the old dataset; the table's own column and the opt-in stay.
    expect(p.sourceMatchColumnId()).toBeNull();
    expect(p.matchColumnId()).toBe('part');
    expect(p.matchEnabled()).toBe(true);
  });

  it('never affects the fixed pointer a chart band uses', () => {
    const p = picker();
    p.seed({ ...limits, sourceRowId: 'r1' });

    expect(p.toPointer()).toEqual({ ...limits, sourceRowId: 'r1' });
  });
});

describe('hasFixedLimits', () => {
  it('is true only for a fixed-row tolerance — the filter operators need a single band', () => {
    expect(hasFixedLimits({ ...limits, sourceRowId: 'r1' })).toBe(true);
    expect(hasFixedLimits({ ...limits, match: { columnId: 'a', sourceColumnId: 'b' } })).toBe(false);
    expect(hasFixedLimits(null)).toBe(false);
    expect(hasFixedLimits(undefined)).toBe(false);
  });
});
