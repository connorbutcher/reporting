import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterGroup } from '../../../../core/models/filter';
import { FilterGroupModel } from '../../models/filter';
import {
  column,
  condition,
  contextOf,
  groupOf,
  schemaOf,
} from '../../models/filter/testing/filter-fixtures';
import { FilterBuilderComponent } from './filter-builder.component';

interface Setup {
  dto?: FilterGroup | null;
  context?: Parameters<typeof contextOf>[0];
  additionalFilter?: FilterGroup | null;
  hint?: string;
}

describe('FilterBuilderComponent', () => {
  let fixture: ComponentFixture<FilterBuilderComponent>;
  let http: HttpTestingController;
  let group: FilterGroupModel;
  let context: ReturnType<typeof contextOf>;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.useRealTimers());

  async function render({ dto = null, context: options = {}, additionalFilter = null, hint = '' }: Setup = {}) {
    context = contextOf(options);
    group = new FilterGroupModel(dto, context);
    fixture = TestBed.createComponent(FilterBuilderComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('additionalFilter', additionalFilter);
    fixture.componentRef.setInput('hint', hint);
    await settle();
  }

  /** Lets effects run, then waits out the count debounce. */
  async function settle(ms = 0): Promise<void> {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent!.replace(/\s+/g, ' ').trim();
  const rows = () => [...el().querySelectorAll('.filter-row')] as HTMLElement[];
  const match = () => el().querySelector('.filter-match') as HTMLElement | null;
  const counts = () => http.match((r) => r.url.endsWith('/count'));
  const button = (label: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent!.includes(label) || b.getAttribute('aria-label') === label);

  async function countAnd(result: { totalRowCount: number; matchedRowCount: number }) {
    await settle(350);
    const [req] = counts();
    req.flush(result);
    await settle();
    return req;
  }

  describe('before there is anything to edit', () => {
    it('says the columns are loading until the schema and operators are in', async () => {
      await render({ context: { schema: null } });

      expect(text()).toContain('Loading columns…');
      expect(button('Add condition')).toBeUndefined();
    });

    it('says so when the dataset has no columns', async () => {
      await render({ context: { columns: [] } });

      expect(text()).toContain('This dataset has no columns to filter on.');
    });

    it('shows the hint when given one', async () => {
      await render({ hint: 'Filtering Bearings' });

      expect(el().querySelector('.panel-hint')!.textContent).toContain('Filtering Bearings');
    });

    it('sends no count request without a dataset', async () => {
      await render({ context: { schema: null } });
      await settle(400);

      expect(counts()).toHaveLength(0);
    });
  });

  describe('the live match count', () => {
    it('shows "Checking rows…" while the first count is in flight', async () => {
      await render();
      await settle(350);

      expect(match()!.textContent).toContain('Checking rows…');
      expect(match()!.classList).toContain('is-pending');
      counts().forEach((r) => r.flush({ totalRowCount: 1, matchedRowCount: 1 }));
    });

    it('says "All N rows match" when the filter narrows nothing', async () => {
      await render();

      await countAnd({ totalRowCount: 1200, matchedRowCount: 1200 });

      expect(match()!.textContent).toContain('All 1,200 rows match');
    });

    it('says how many of the rows match, and flags zero', async () => {
      await render();
      await countAnd({ totalRowCount: 100, matchedRowCount: 5 });
      expect(match()!.textContent!.replace(/\s+/g, ' ')).toContain('5 of 100 rows match');
      expect(match()!.classList).not.toContain('is-empty');

      group.addCondition('a');
      group.children()[0].setValue(0, 'x');
      await countAnd({ totalRowCount: 100, matchedRowCount: 0 });
      expect(match()!.classList).toContain('is-empty');
    });

    it('notes when the report filter is folded in', async () => {
      await render({ additionalFilter: groupOf('and', condition('a', 'equals', ['x'])) });

      await countAnd({ totalRowCount: 10, matchedRowCount: 1 });

      expect(match()!.textContent).toContain('(incl. the report filter)');
    });

    it('asks the server for the count over this filter and the additional one', async () => {
      const extra = groupOf('and', condition('a', 'equals', ['x']));
      await render({ dto: groupOf('and', condition('a', 'equals', ['y'])), additionalFilter: extra });

      const req = await countAnd({ totalRowCount: 1, matchedRowCount: 1 });

      expect(req.request.method).toBe('POST');
      expect(req.request.url).toBe('/api/datasets/7/count');
      expect(req.request.body).toEqual({
        filter: groupOf('and', extra, groupOf('and', condition('a', 'equals', ['y']))),
      });
    });

    it('holds the last numbers, dimmed, while the next count is in flight', async () => {
      await render();
      await countAnd({ totalRowCount: 100, matchedRowCount: 5 });

      group.addCondition('a');
      group.children()[0].setValue(0, 'x');
      await settle(350);

      expect(match()!.textContent!.replace(/\s+/g, ' ')).toContain('5 of 100 rows match');
      expect(match()!.classList).toContain('is-pending');
      counts().forEach((r) => r.flush({ totalRowCount: 100, matchedRowCount: 1 }));
    });

    it('makes one request for a burst of edits', async () => {
      await render();
      await countAnd({ totalRowCount: 10, matchedRowCount: 10 });

      group.addCondition('a');
      const only = group.children()[0];
      only.setValue(0, 'x');
      await settle(100);
      only.setValue(0, 'xy');
      await settle(100);
      only.setValue(0, 'xyz');
      await settle(400);

      expect(counts()).toHaveLength(1);
    });

    it('makes no request for an edit that leaves the query unchanged', async () => {
      await render();
      await countAnd({ totalRowCount: 10, matchedRowCount: 10 });

      group.addCondition('a');
      await settle(400);

      expect(counts()).toHaveLength(0);
    });

    it('says it couldn’t count, rather than throwing, when the request fails', async () => {
      await render();
      await settle(350);

      counts()[0].flush('boom', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(match()!.classList).toContain('is-error');
      expect(match()!.textContent).toContain('Couldn’t count matching rows');
    });
  });

  describe('the conditions list', () => {
    it('says there are none, and offers Add condition but not Clear all', async () => {
      await render();

      expect(text()).toContain('No conditions — every row is shown.');
      expect(button('Add condition')).toBeDefined();
      expect(button('Clear all')).toBeUndefined();
    });

    it('labels the list with how many conditions there are and how many are switched on', async () => {
      await render({ dto: groupOf('and', condition('a', 'equals', ['x']), condition('a', 'equals', ['y'], false)) });

      expect(el().querySelector('.filter-rows-label')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
        '2 conditions · 1 active',
      );
    });

    it('offers the join only once there is more than one condition', async () => {
      await render({ dto: groupOf('and', condition('a', 'equals', ['x'])) });
      expect(el().querySelector('#filter-join')).toBeNull();

      group.addCondition('a');
      await settle();
      expect(el().querySelector('label[for="filter-join"]')).not.toBeNull();
    });

    it('adds a condition from the button, and removes or clears them', async () => {
      await render({ dto: groupOf('and', condition('a', 'equals', ['x']), condition('b', 'equals', ['1'])) });
      expect(rows()).toHaveLength(2);

      button('Add condition')!.click();
      await settle();
      expect(rows()).toHaveLength(3);

      button('Remove condition 1')!.click();
      await settle();
      expect(rows()).toHaveLength(2);
      expect(group.children().map((c) => c.columnId())).toEqual(['b', 'a']);

      button('Clear all')!.click();
      await settle();
      expect(rows()).toHaveLength(0);
    });

    it('mutes a switched-off row', async () => {
      await render({ dto: groupOf('and', condition('a', 'equals', ['x'], false)) });

      expect(rows()[0].classList).toContain('filter-row--off');
    });

    it('marks a row that can’t narrow anything, with the reason', async () => {
      await render({
        dto: groupOf('and', condition('a', 'equals'), condition('b', 'inTolerance'), condition('gone', 'equals', ['x'])),
      });

      const [blank, banding, removed] = rows();
      expect(blank.classList).toContain('filter-row--error');
      expect(blank.querySelector('.filter-row-problem')!.textContent).toContain('Enter a value.');
      expect(banding.classList).toContain('filter-row--warning');
      expect(banding.querySelector('.filter-row-problem')!.textContent).toContain('No tolerance banding');
      expect(removed.querySelector('.filter-row-problem')!.textContent).toContain('no longer exists');
    });

    it('does not flag a healthy row', async () => {
      await render({ dto: groupOf('and', condition('a', 'equals', ['x'])) });

      expect(rows()[0].querySelector('.filter-row-problem')).toBeNull();
      expect(rows()[0].className).not.toMatch(/--(error|warning)/);
    });
  });

  describe('operand inputs', () => {
    const inputs = () => [...el().querySelectorAll('input.value')] as HTMLInputElement[];

    it('shows a typed input for a number, with its value', async () => {
      await render({ dto: groupOf('and', condition('b', 'equals', ['42'])) });

      expect(inputs()).toHaveLength(1);
      expect(inputs()[0].type).toBe('number');
      expect(inputs()[0].placeholder).toBe('value');
      expect(inputs()[0].value).toBe('42');
    });

    it('shows from/to for a range', async () => {
      await render({ dto: groupOf('and', condition('b', 'between', ['1', '9'])) });

      expect(inputs().map((i) => i.placeholder)).toEqual(['from', 'to']);
      expect(inputs().map((i) => i.value)).toEqual(['1', '9']);
    });

    it('writes an operand back to the condition when the input changes', async () => {
      await render({ dto: groupOf('and', condition('b', 'equals', ['1'])) });

      inputs()[0].value = '77';
      inputs()[0].dispatchEvent(new Event('change'));

      expect(group.children()[0].values()).toEqual(['77']);
    });

    it('shows no input for an operator with no operand', async () => {
      await render({ dto: groupOf('and', condition('a', 'isEmpty')) });

      expect(inputs()).toHaveLength(0);
      expect(el().querySelector('.operands')).toBeNull();
    });

    it('shows a date input, converting a stored ISO date to yyyy-MM-dd', async () => {
      await render({
        dto: groupOf('and', condition('d', 'greaterThan', ['2026-03-04T10:00:00.000Z'])),
        context: { columns: [column('d', 'dateTime')] },
      });

      expect(inputs()[0].type).toBe('date');
      expect(inputs()[0].value).toBe('2026-03-04');
    });

    it('leaves an unparseable date as typed', async () => {
      await render({
        dto: groupOf('and', condition('d', 'greaterThan', ['soon'])),
        context: { columns: [column('d', 'dateTime')] },
      });

      expect(inputs()[0].value).toBe('');
    });
  });

  describe('value pickers for text columns', () => {
    const valuesRequests = () => http.match((r) => r.url.includes('/columns/') && r.url.endsWith('/values'));

    it('offers a select of the column’s values for equals, fetched once', async () => {
      await render({ dto: groupOf('and', condition('a', 'equals', ['x']), condition('a', 'notEquals', ['y'])) });

      const requests = valuesRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].request.url).toBe('/api/datasets/7/columns/a/values');
      requests[0].flush(['x', 'y', 'z']);
      await settle();

      // Column, operator and value are each a select; nothing is typed.
      expect(rows().map((r) => r.querySelectorAll('p-select').length)).toEqual([3, 3]);
      expect(el().querySelector('p-multiselect')).toBeNull();
      expect(el().querySelectorAll('input.value')).toHaveLength(0);
    });

    it('offers a multi-select for "is any of"', async () => {
      await render({ dto: groupOf('and', condition('a', 'in', ['x', 'y'])) });
      valuesRequests().forEach((r) => r.flush(['x', 'y']));
      await settle();

      expect(el().querySelector('p-multiselect')).not.toBeNull();
    });

    it('fetches nothing for a column that is not text, or an operator that types its operand', async () => {
      await render({ dto: groupOf('and', condition('b', 'equals', ['1']), condition('a', 'isEmpty')) });

      expect(valuesRequests()).toHaveLength(0);
    });

    it('fetches when a row switches to a value-list operator, and for each column once', async () => {
      const cols = [column('a'), column('a2')];
      await render({ dto: groupOf('and', condition('a', 'isEmpty')), context: { columns: cols } });
      expect(valuesRequests()).toHaveLength(0);

      group.children()[0].setOperator('equals');
      await settle();
      const first = valuesRequests();
      expect(first.map((r) => r.request.url)).toEqual(['/api/datasets/7/columns/a/values']);
      first.forEach((r) => r.flush(['x']));

      group.addCondition('a2');
      await settle();
      expect(valuesRequests().map((r) => r.request.url)).toEqual(['/api/datasets/7/columns/a2/values']);
    });
  });

  it('exposes the schema’s columns to pick from', async () => {
    await render({ context: { schema: schemaOf([column('a', 'string', 'Alpha'), column('b', 'int', 'Beta')]) } });

    expect(group.columns().map((c) => c.name)).toEqual(['Alpha', 'Beta']);
  });
});
