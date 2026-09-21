import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { ToleranceConfig } from '../../../../../core/models/report';
import { NotificationService } from '../../../../../core/services/notification.service';
import { PanelNavigation } from '../../../state/panel-navigation';
import { ReportSession } from '../../../state/report-session';
import { PanelColumnToleranceComponent } from './panel-column-tolerance.component';

const limitsSchema = {
  id: 2,
  name: 'Limits',
  columns: [
    { id: 'lpart', name: 'Part', type: 'string' },
    { id: 'min', name: 'Min', type: 'double' },
    { id: 'max', name: 'Max', type: 'double' },
  ],
};

describe('PanelColumnToleranceComponent per-row matching', () => {
  let setTolerance: ReturnType<typeof vi.fn>;

  function render() {
    setTolerance = vi.fn();
    const column = { tolerance: signal<ToleranceConfig | null>(null), setTolerance };
    const table = {
      column: () => column,
      schema: () => ({ columns: [{ id: 'part', name: 'Part Number', type: 'string' }, { id: 'reading', name: 'Reading', type: 'double' }] }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ReportSession, useValue: { datasets: signal([{ id: 2, name: 'Limits' }]), selectedTableWidget: signal(table) } },
        { provide: PanelNavigation, useValue: { view: signal({ kind: 'columnTolerance', columnId: 'reading' }) } },
        { provide: NotificationService, useValue: { loadError: () => undefined } },
        {
          provide: DatasetApiService,
          useValue: {
            getSchema: () => of(limitsSchema),
            getData: () => of({ rows: [{ id: 'r1', values: { lpart: 'A', min: '1', max: '2' } }] }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PanelColumnToleranceComponent);
    fixture.detectChanges();
    const picker = (fixture.componentInstance as unknown as { picker: import('../../../state/tolerance-source-picker').ToleranceSourcePicker }).picker;
    picker.selectDataset(2);
    fixture.detectChanges();
    return { fixture, picker, el: fixture.nativeElement as HTMLElement };
  }

  const text = (el: HTMLElement) => el.textContent!.replace(/\s+/g, ' ');

  beforeEach(() => TestBed.resetTestingModule());

  it('offers the spec row by default, with matching left off', () => {
    const { el } = render();

    expect(text(el)).toContain('Spec row');
    expect(text(el)).not.toContain("This table's column");
    expect(el.querySelector('#tolerance-match')).not.toBeNull();
    expect((el.querySelector('input#tolerance-match') as HTMLInputElement).checked).toBe(false);
  });

  it('swaps the spec row for the two match columns when the reader opts in', () => {
    const { el, fixture } = render();

    (el.querySelector('input#tolerance-match') as HTMLInputElement).click();
    fixture.detectChanges();

    expect(text(el)).not.toContain('Spec row');
    expect(text(el)).toContain("This table's column");
    expect(text(el)).toContain("Limits dataset's column");
    expect(text(el)).toContain("Tolerance filters aren't available");
    expect(text(el)).toContain('Pick the two columns to match on');
  });

  it('saves a matched tolerance — with no fixed row — once both columns and the bounds are chosen', () => {
    const { picker, fixture } = render();
    picker.matchEnabled.set(true);
    picker.matchColumnId.set('part');
    picker.sourceMatchColumnId.set('lpart');
    picker.minColumnId.set('min');
    picker.maxColumnId.set('max');
    fixture.detectChanges();

    expect(setTolerance).toHaveBeenLastCalledWith({
      sourceDatasetId: 2,
      match: { columnId: 'part', sourceColumnId: 'lpart' },
      minColumnId: 'min',
      maxColumnId: 'max',
    });
  });

  it('leaves the saved tolerance alone while the match is half-chosen', () => {
    const { picker, fixture } = render();
    picker.matchEnabled.set(true);
    picker.matchColumnId.set('part');
    picker.minColumnId.set('min');
    picker.maxColumnId.set('max');
    fixture.detectChanges();

    expect(setTolerance).not.toHaveBeenCalled();
  });
});
