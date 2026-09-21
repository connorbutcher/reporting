import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterApiService } from '../../../../core/api/filter-api.service';
import { DEFAULT_PIVOT_CONFIG, PivotTableWidgetConfig } from '../../../../core/models/report';
import { PivotQueryRequest, PivotQueryResult } from '../../../../core/models/widget-query';
import { PivotTableWidgetComponent } from './pivot-table-widget.component';

const result: PivotQueryResult = {
  id: '1',
  name: 'D',
  rowFields: [{ columnId: 'region', label: 'Region' }],
  measures: [
    { key: 'm0', label: 'Sum of Qty', columnId: 'qty', aggregate: 'sum' },
    { key: 'm1', label: 'Sum of Cost', columnId: 'cost', aggregate: 'sum' },
  ],
  rows: [],
  grandTotal: null,
  totalRowCount: 10,
  matchedRowCount: 10,
  truncated: false,
};

const config = (over: Partial<PivotTableWidgetConfig> = {}): PivotTableWidgetConfig => ({
  ...DEFAULT_PIVOT_CONFIG,
  type: 'pivotTable',
  datasetId: 1,
  rowFields: ['region'],
  measures: [
    { id: 'qty', columnId: 'qty', aggregate: 'sum', label: '' },
    { id: 'cost', columnId: 'cost', aggregate: 'sum', label: '' },
  ],
  ...over,
});

describe('PivotTableWidgetComponent header sort', () => {
  let fixture: ComponentFixture<PivotTableWidgetComponent>;
  let queryPivot: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    queryPivot = vi.fn(() => of(result));
    TestBed.configureTestingModule({
      providers: [
        { provide: DatasetApiService, useValue: { getSchema: () => of({ columns: [] }), queryPivot } },
        { provide: FilterApiService, useValue: { operators: () => of({}) } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  /** Renders the widget with `over` on its config and waits for the first (debounced) query to land. */
  async function render(over: Partial<PivotTableWidgetConfig> = {}): Promise<void> {
    fixture = TestBed.createComponent(PivotTableWidgetComponent);
    fixture.componentRef.setInput('config', config(over));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
  }

  const lastRequest = (): PivotQueryRequest => queryPivot.mock.calls.at(-1)![1] as PivotQueryRequest;
  const header = (i: number) => fixture.nativeElement.querySelectorAll('th')[i] as HTMLElement;

  async function clickMeasure(i: number): Promise<void> {
    (header(i).querySelector('button.sort') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  it('renders only measure headers as sort buttons', async () => {
    await render();

    expect(header(0).querySelector('button')).toBeNull();
    expect(header(0).getAttribute('aria-sort')).toBeNull();
    expect(header(1).querySelector('button.sort')).not.toBeNull();
    expect(header(1).getAttribute('aria-sort')).toBe('none');
  });

  it('cycles a measure header through highest first, lowest first, then unsorted', async () => {
    await render();
    expect(lastRequest().sortMeasureIndex).toBeNull();

    await clickMeasure(2);
    expect(lastRequest()).toMatchObject({ sortMeasureIndex: 1, sortDescending: true });
    expect(header(2).getAttribute('aria-sort')).toBe('descending');

    await clickMeasure(2);
    expect(lastRequest()).toMatchObject({ sortMeasureIndex: 1, sortDescending: false });
    expect(header(2).getAttribute('aria-sort')).toBe('ascending');

    await clickMeasure(2);
    expect(lastRequest().sortMeasureIndex).toBeNull();
    expect(header(2).getAttribute('aria-sort')).toBe('none');
  });

  it('starts from the report’s saved sort and lets a reader override it', async () => {
    await render({ sortMeasureId: 'qty', sortDescending: true });
    expect(lastRequest()).toMatchObject({ sortMeasureIndex: 0, sortDescending: true });
    expect(header(1).getAttribute('aria-sort')).toBe('descending');

    // Sorting by the other measure replaces the saved sort rather than stacking on it.
    await clickMeasure(2);
    expect(lastRequest()).toMatchObject({ sortMeasureIndex: 1, sortDescending: true });
    expect(header(1).getAttribute('aria-sort')).toBe('none');
  });

  it('drops the reader’s sort when the widget’s configuration changes', async () => {
    await render();
    await clickMeasure(2);
    expect(lastRequest().sortMeasureIndex).toBe(1);

    fixture.componentRef.setInput('config', config({ showGrandTotal: true }));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);

    expect(lastRequest().sortMeasureIndex).toBeNull();
  });
});
