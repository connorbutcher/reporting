import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterApiService } from '../../../../core/api/filter-api.service';
import { DEFAULT_TABLE_CONFIG, DataTableWidgetConfig } from '../../../../core/models/report';
import {
  TableQueryRequest,
  TableQueryResult,
  TableRowResult,
} from '../../../../core/models/widget-query';
import { NotificationService } from '../../../../core/services/notification.service';
import { DataTableWidgetComponent, SCROLL_WINDOW, csvValue } from './data-table-widget.component';

const row = (i: number): TableRowResult => ({
  id: `r${i}`,
  cells: {
    name: { displayValue: `Part ${i}`, value: `Part ${i}`, tolerance: 'none' },
    cost: { displayValue: `£${i}.00`, value: i, tolerance: 'none' },
  },
});

/** A query answer for rows [skip, skip + take) out of `matched`. */
const page = (request: TableQueryRequest, matched: number): TableQueryResult => ({
  id: '1',
  name: 'D',
  rows: Array.from(
    { length: Math.max(0, Math.min(request.take || matched, matched - request.skip)) },
    (_, i) => row(request.skip + i),
  ),
  totalRowCount: matched,
  matchedRowCount: matched,
  totals: { cost: { displayValue: '£999.00', value: 999, tolerance: 'none' } },
});

const config = (over: Partial<DataTableWidgetConfig> = {}): DataTableWidgetConfig => ({
  ...DEFAULT_TABLE_CONFIG,
  type: 'dataTable',
  datasetId: 1,
  columns: [{ columnId: 'name' }, { columnId: 'cost', total: 'sum' }],
  ...over,
});

type Internals = {
  rows: () => (TableRowResult | undefined)[];
  onLazyLoad: (event: { first?: number; last?: number }) => void;
  exportCsv: () => Promise<string | null>;
  searchText: { set: (v: string) => void };
  cellClass: (col: unknown, cell: unknown) => string;
  displayColumns: () => unknown[];
};

describe('DataTableWidgetComponent', () => {
  let fixture: ComponentFixture<DataTableWidgetComponent>;
  let queryTable: ReturnType<typeof vi.fn>;
  let exportTable: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.fn>;
  const matched = 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    queryTable = vi.fn((_id: number, request: TableQueryRequest) => of(page(request, matched)));
    exportTable = vi.fn((_id: number, request: TableQueryRequest) =>
      of(page({ ...request, take: 0 }, matched)),
    );
    warn = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DatasetApiService,
          useValue: {
            getSchema: () =>
              of({
                columns: [
                  { id: 'name', name: 'Name', type: 'string' },
                  { id: 'cost', name: 'Cost', type: 'double' },
                ],
              }),
            queryTable,
            exportTable,
          },
        },
        { provide: FilterApiService, useValue: { operators: () => of({}) } },
        { provide: NotificationService, useValue: { warn } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function render(over: Partial<DataTableWidgetConfig> = {}): Promise<Internals> {
    fixture = TestBed.createComponent(DataTableWidgetComponent);
    fixture.componentRef.setInput('config', config(over));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as Internals;
  }

  const lastRequest = (): TableQueryRequest =>
    queryTable.mock.calls.at(-1)![1] as TableQueryRequest;

  it('holds a placeholder for every matched row and fills the first window', async () => {
    const table = await render();

    expect(lastRequest()).toMatchObject({ skip: 0, take: SCROLL_WINDOW });
    expect(table.rows().length).toBe(matched);
    expect(table.rows()[0]?.id).toBe('r0');
    expect(table.rows()[SCROLL_WINDOW]).toBeUndefined();
  });

  it('fetches the windows a reader scrolls to, once each', async () => {
    const table = await render();
    queryTable.mockClear();

    table.onLazyLoad({ first: 2 * SCROLL_WINDOW + 10, last: 2 * SCROLL_WINDOW + 40 });
    table.onLazyLoad({ first: 2 * SCROLL_WINDOW + 20, last: 2 * SCROLL_WINDOW + 50 });
    await vi.advanceTimersByTimeAsync(0);

    expect(queryTable).toHaveBeenCalledTimes(1);
    expect(lastRequest()).toMatchObject({ skip: 2 * SCROLL_WINDOW, take: SCROLL_WINDOW });
    expect(table.rows()[2 * SCROLL_WINDOW + 10]?.id).toBe(`r${2 * SCROLL_WINDOW + 10}`);
  });

  it('pages a paginated table one page at a time', async () => {
    const table = await render({ paginator: true, rowsPerPage: 25 });

    expect(lastRequest()).toMatchObject({ skip: 0, take: 25 });
    expect(table.rows().length).toBe(25);
  });

  it('sends what the reader types in the search box', async () => {
    const table = await render({ showSearch: true });

    table.searchText.set('  bolt ');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);

    expect(lastRequest().search).toBe('bolt');
  });

  it('exports every matched row with raw values and the totals row', async () => {
    const table = await render({ showTotals: true });

    const csv = (await table.exportCsv())!.split('\n');

    expect(exportTable).toHaveBeenCalledTimes(1);
    expect(csv[0]).toBe('Name,Cost');
    expect(csv[1]).toBe('Part 0,0');
    expect(csv.length).toBe(1 + matched + 1);
    expect(csv.at(-1)).toBe('Total,999');
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when the export hit the server’s cap', async () => {
    exportTable.mockReturnValueOnce(
      of({ ...page({ skip: 0, take: 10 } as TableQueryRequest, matched) }),
    );
    const table = await render();

    await table.exportCsv();

    expect(warn).toHaveBeenCalledWith('Exported the first 10 of 1,000 rows.', 'Export limited');
  });

  it('highlights a cell by the first conditional-format rule it matches', async () => {
    const table = await render({
      columns: [
        {
          columnId: 'cost',
          formatRules: [{ operator: 'greaterThan', value: '5', style: 'green' }],
        },
      ],
    });
    const [cost] = table.displayColumns();

    expect(table.cellClass(cost, { displayValue: '9', value: 9, tolerance: 'none' })).toContain(
      'fmt-green',
    );
    expect(table.cellClass(cost, { displayValue: '1', value: 1, tolerance: 'fail' })).toBe(
      'cell-red',
    );
  });
});

describe('csvValue', () => {
  it('writes numbers raw and dates in a form spreadsheets read', () => {
    expect(csvValue({ displayValue: '£1,234.50', value: 1234.5, tolerance: 'none' })).toBe(1234.5);
    expect(
      csvValue({ displayValue: '05/01/2026', value: '2026-01-05T00:00:00', tolerance: 'none' }),
    ).toBe('2026-01-05');
    expect(csvValue({ displayValue: 'x', value: '2026-01-05T14:30:00Z', tolerance: 'none' })).toBe(
      '2026-01-05 14:30:00',
    );
    expect(csvValue({ displayValue: 'Yes', value: true, tolerance: 'none' })).toBe('Yes');
    expect(csvValue(undefined)).toBe('');
  });
});
