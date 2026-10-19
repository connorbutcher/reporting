import { Dialog } from '@angular/cdk/dialog';
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

  it('renders dimension and measure headers as sort buttons', async () => {
    await render();

    expect(header(0).querySelector('button.sort')).not.toBeNull();
    expect(header(0).getAttribute('aria-sort')).toBe('none');
    expect(header(1).querySelector('button.sort')).not.toBeNull();
    expect(header(1).getAttribute('aria-sort')).toBe('none');
  });

  it('cycles a dimension header through A to Z, Z to A, then the default order', async () => {
    await render();

    await clickMeasure(0);
    expect(lastRequest()).toMatchObject({ sortRowFieldIndex: 0, sortMeasureIndex: null, sortDescending: false });
    expect(header(0).getAttribute('aria-sort')).toBe('ascending');

    await clickMeasure(0);
    expect(lastRequest()).toMatchObject({ sortRowFieldIndex: 0, sortDescending: true });
    expect(header(0).getAttribute('aria-sort')).toBe('descending');

    await clickMeasure(0);
    expect(lastRequest()).toMatchObject({ sortRowFieldIndex: null, sortMeasureIndex: null });
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

describe('PivotTableWidgetComponent layout', () => {
  let fixture: ComponentFixture<PivotTableWidgetComponent>;
  let queryPivot: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;

  const cell = (value: number | null) => ({ value, displayValue: value === null ? null : String(value) });

  const crossTab: PivotQueryResult = {
    ...result,
    rowFields: [
      { columnId: 'region', label: 'Region' },
      { columnId: 'product', label: 'Product' },
    ],
    columnFields: [{ columnId: 'year', label: 'Year' }],
    measures: [{ key: 'm0', label: 'Sum of Qty', columnId: 'qty', aggregate: 'sum' }],
    columnKeys: [
      { labels: ['2025'], drill: { kind: 'group', join: 'and', children: [{ kind: 'condition', columnId: 'year', operator: 'equals', values: ['2025'] }] } },
      { labels: ['2026'], drill: null },
    ],
    hasRowTotals: true,
    rows: [
      { dimensions: ['North', ''], values: [cell(3), cell(4), cell(7)], isGrandTotal: false, isSubtotal: true, depth: 1, drill: { kind: 'group', join: 'and', children: [] } },
      { dimensions: ['North', 'Bolt'], values: [cell(1), cell(4), cell(5)], isGrandTotal: false, depth: 2, drill: { kind: 'group', join: 'and', children: [{ kind: 'condition', columnId: 'product', operator: 'equals', values: ['Bolt'] }] } },
      { dimensions: ['North', 'Nut'], values: [cell(2), cell(null), cell(2)], isGrandTotal: false, depth: 2, drill: null },
      { dimensions: ['South', ''], values: [cell(1), cell(null), cell(1)], isGrandTotal: false, isSubtotal: true, depth: 1, drill: null },
      { dimensions: ['South', 'Nut'], values: [cell(1), cell(null), cell(1)], isGrandTotal: false, depth: 2, drill: null },
    ],
    grandTotal: { dimensions: ['Total', ''], values: [cell(4), cell(4), cell(8)], isGrandTotal: true },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    queryPivot = vi.fn(() => of(crossTab));
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DatasetApiService, useValue: { getSchema: () => of({ columns: [] }), queryPivot } },
        { provide: FilterApiService, useValue: { operators: () => of({}) } },
        { provide: Dialog, useValue: { open } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function render(over: Partial<PivotTableWidgetConfig> = {}): Promise<void> {
    fixture = TestBed.createComponent(PivotTableWidgetComponent);
    fixture.componentRef.setInput(
      'config',
      config({
        rowFields: ['region', 'product'],
        columnFields: ['year'],
        measures: [{ id: 'qty', columnId: 'qty', aggregate: 'sum', label: '' }],
        showSubtotals: true,
        ...over,
      }),
    );
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
  }

  const bodyRows = () => [...fixture.nativeElement.querySelectorAll('tbody tr')] as HTMLElement[];
  const texts = (row: HTMLElement) => [...row.querySelectorAll('td')].map((td) => td.textContent!.trim());

  it('heads each column key and the totals over their measures', async () => {
    await render();

    const [top, measures] = [...fixture.nativeElement.querySelectorAll('thead tr')] as HTMLElement[];
    expect([...top.querySelectorAll('th')].map((th) => th.textContent!.trim())).toEqual(['Region', 'Product', '2025', '2026', 'Total']);
    expect(measures.querySelectorAll('th').length).toBe(3);
    expect(lastCall().columnFields).toEqual(['year']);
    expect(lastCall().showSubtotals).toBe(true);
  });

  it('lays out the outline, blanking a parent repeated from the subtotal above', async () => {
    await render();

    expect(texts(bodyRows()[0])).toEqual(['North', '', '3', '4', '7']);
    expect(texts(bodyRows()[1])).toEqual(['', 'Bolt', '1', '4', '5']);
    expect(bodyRows()[0].classList).toContain('subtotal');
  });

  it('folds a subtotal’s rows away and back', async () => {
    await render();
    const toggle = () => bodyRows()[0].querySelector('button.toggle') as HTMLButtonElement;

    toggle().click();
    fixture.detectChanges();
    expect(bodyRows().length).toBe(3);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');

    toggle().click();
    fixture.detectChanges();
    expect(bodyRows().length).toBe(5);
  });

  it('opens the rows behind a value with the row’s and column’s conditions', async () => {
    await render();

    (bodyRows()[1].querySelectorAll('td')[2] as HTMLElement).click();

    expect(open).toHaveBeenCalledTimes(1);
    const data = open.mock.calls[0][1].data;
    expect(data.title).toBe('Pivot table › North › Bolt › 2025');
    expect(data.filter.children.map((c: { children: unknown[] }) => c.children)).toEqual([
      [{ kind: 'condition', columnId: 'product', operator: 'equals', values: ['Bolt'] }],
      [{ kind: 'condition', columnId: 'year', operator: 'equals', values: ['2025'] }],
    ]);
  });

  it('only offers drill-through where the server could express the rows', async () => {
    await render();

    expect(bodyRows()[1].querySelectorAll('td')[3].classList).not.toContain('drillable');
    expect(bodyRows()[2].querySelectorAll('td')[2].classList).not.toContain('drillable');
    (bodyRows()[2].querySelectorAll('td')[4] as HTMLElement).click();
    expect(open).not.toHaveBeenCalled();
  });

  it('highlights values by their measure’s rules', async () => {
    await render({
      measures: [
        { id: 'qty', columnId: 'qty', aggregate: 'sum', label: '', formatRules: [{ operator: 'greaterThanOrEqual', value: '5', style: 'red' }] },
      ],
    });

    expect(bodyRows()[1].querySelectorAll('td')[4].classList).toContain('fmt-red');
    expect(bodyRows()[1].querySelectorAll('td')[2].classList).not.toContain('fmt-red');
  });

  it('says plainly when only part of the data was summarised', async () => {
    queryPivot.mockReturnValue(of({ ...crossTab, scanTruncated: true, scannedRowCount: 200000, matchedRowCount: 250000, truncated: true }));
    await render();

    expect(fixture.nativeElement.querySelector('app-widget-count-bar').textContent).toContain(
      'Totals are incomplete: only the first 200,000 of 250,000 rows were summarised',
    );
  });

  const lastCall = (): PivotQueryRequest => queryPivot.mock.calls.at(-1)![1] as PivotQueryRequest;
});
