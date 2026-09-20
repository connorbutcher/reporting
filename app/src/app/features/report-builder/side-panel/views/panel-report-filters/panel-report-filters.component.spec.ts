import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReportFilterModel } from '../../../models/filter';
import {
  column,
  condition,
  contextOf,
  groupOf,
  schemaOf,
} from '../../../models/filter/testing/filter-fixtures';
import { ReportSession } from '../../../state/report-session';
import { PanelReportFiltersComponent } from './panel-report-filters.component';

describe('PanelReportFiltersComponent', () => {
  let fixture: ComponentFixture<PanelReportFiltersComponent>;
  let filters: Map<number, ReportFilterModel>;
  let datasetIds: ReturnType<typeof signal<number[]>>;
  let ensured: number[];

  const filterFor = (id: number, ...conditions: ReturnType<typeof condition>[]) =>
    new ReportFilterModel(
      id,
      conditions.length ? groupOf('and', ...conditions) : null,
      contextOf({ schema: schemaOf([column('a')], id, `Dataset ${id}`) }),
    );

  beforeEach(async () => {
    ensured = [];
    filters = new Map([
      [7, filterFor(7, condition('a', 'equals', ['x']), condition('a', 'equals', ['y']))],
      [8, filterFor(8, condition('a', 'equals', ['z']))],
      [9, filterFor(9)],
    ]);
    datasetIds = signal([7, 8, 9]);
    const model = {
      tabs: () => [],
      usedDatasetIds: datasetIds,
      reportFilter: (id: number) => filters.get(id) ?? null,
      ensureReportFilter: (id: number) => {
        ensured.push(id);
        return filters.get(id)!;
      },
    };
    const session = {
      model: signal(model),
      datasets: signal([
        { id: 7, name: 'Bearings' },
        { id: 8, name: 'Torque' },
        { id: 9, name: 'Gearbox' },
      ]),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ReportSession, useValue: session },
      ],
    });
    fixture = TestBed.createComponent(PanelReportFiltersComponent);
    await fixture.whenStable();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const chips = () => [...el().querySelectorAll('.dataset-chip')] as HTMLElement[];
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('says to add a widget when no dataset is in use', async () => {
    datasetIds.set([]);
    await settle();

    expect(el().textContent).toContain('Add a widget and bind it to a dataset');
    expect(chips()).toHaveLength(0);
  });

  it('shows a chip per dataset in use, named, with its condition count', () => {
    expect(chips().map((c) => c.querySelector('.dataset-chip-label')!.textContent!.trim())).toEqual([
      'Bearings',
      'Torque',
      'Gearbox',
    ]);
    expect(chips().map((c) => c.querySelector('.dataset-chip-count')?.textContent?.trim() ?? null)).toEqual([
      '2',
      '1',
      null,
    ]);
  });

  it('words each chip’s accessible name with its conditions', () => {
    expect(chips().map((c) => c.getAttribute('aria-label'))).toEqual([
      'Bearings, 2 conditions',
      'Torque, 1 condition',
      'Gearbox, no conditions',
    ]);
  });

  it('starts on the first dataset, marked current', () => {
    expect(chips()[0].classList).toContain('active');
    expect(chips()[0].getAttribute('aria-current')).toBe('true');
    expect(chips()[1].getAttribute('aria-current')).toBeNull();
  });

  it('switches to the dataset whose chip is clicked', async () => {
    chips()[1].click();
    await settle();

    expect(chips()[1].classList).toContain('active');
    expect(chips()[0].classList).not.toContain('active');
    expect(el().querySelector('app-filter-builder')).not.toBeNull();
    expect(el().textContent).toContain('Filtering Dataset 8');
  });

  it('creates the filter for the dataset on screen, so there is always one to bind to', async () => {
    expect(ensured).toContain(7);

    chips()[1].click();
    await settle();

    expect(ensured).toContain(8);
  });

  it('shows no chips when there is only one dataset', async () => {
    datasetIds.set([7]);
    await settle();

    expect(chips()).toHaveLength(0);
    expect(el().querySelector('app-filter-builder')).not.toBeNull();
  });
});
