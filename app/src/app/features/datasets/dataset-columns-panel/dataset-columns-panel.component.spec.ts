import { Dialog } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColumnTypeImpact, ColumnUse, DatasetColumn, DatasetColumnType } from '../../../core/models/dataset';
import { ConfirmDialogData } from '../../home/confirm-dialog/confirm-dialog.component';
import { DatasetsStore } from '../datasets.store';
import { DatasetColumnsPanelComponent } from './dataset-columns-panel.component';

const col = (id: string, name: string): DatasetColumn =>
  ({ id, name, type: 'string', order: 0, configuration: {} }) as unknown as DatasetColumn;

const use = (over: Partial<ColumnUse> = {}): ColumnUse => ({
  kind: 'widget',
  widgetId: 'w1',
  widgetTitle: 'Sales log',
  widgetType: 'dataTable',
  tabName: 'Overview',
  roles: ['Table column'],
  ...over,
});

describe('DatasetColumnsPanelComponent column usage', () => {
  let open: ReturnType<typeof vi.fn>;
  let deleteColumn: ReturnType<typeof vi.fn>;
  let known = signal(true);

  function render(usesById: Record<string, ColumnUse[]>) {
    open = vi.fn(() => ({ closed: of(true) }));
    deleteColumn = vi.fn();
    known = signal(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Dialog, useValue: { open } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reportId: '7' }) } } },
        {
          provide: DatasetsStore,
          useValue: {
            columns: signal([col('region', 'Region'), col('notes', 'Notes')]),
            schemaLoading: signal(false),
            columnUses: (id: string) => usesById[id] ?? [],
            columnUsageKnown: known,
            deleteColumn,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(DatasetColumnsPanelComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const chips = (el: HTMLElement) => [...el.querySelectorAll('.usage-toggle')].map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
  const deleteButton = (el: HTMLElement, name: string) =>
    el.querySelector(`button[aria-label="Delete column ${name}"]`) as HTMLButtonElement;
  const confirmation = () => open.mock.calls.at(-1)![1].data as ConfirmDialogData;

  beforeEach(() => TestBed.resetTestingModule());

  it('flags a column widgets use, and says nothing about one nothing uses', () => {
    const { el } = render({ region: [use(), use({ widgetId: 'w2', widgetTitle: 'Chart' })] });

    expect(chips(el)).toEqual(['Used in 2 widgets']);
  });

  it('opens a list of the widgets, each linking to it in the builder', () => {
    const { el, fixture } = render({ region: [use()] });

    (el.querySelector('.usage-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const link = el.querySelector('.usage-list a') as HTMLAnchorElement;
    expect(link.textContent).toContain('Sales log');
    expect(link.getAttribute('href')).toContain('/reports/7/edit');
    expect(link.getAttribute('href')).toContain('#');
    expect(el.querySelector('.usage-list')!.textContent).toContain('Table column');
  });

  it('warns what a delete would break, naming each widget, and asks for a stronger confirmation', () => {
    const { el } = render({ region: [use(), use({ kind: 'reportFilter', widgetId: null, widgetTitle: null, widgetType: null, tabName: null, roles: ['Filter condition'] })] });

    deleteButton(el, 'Region').click();

    const data = confirmation();
    expect(data.title).toBe('Delete a column that is in use');
    expect(data.message).toContain('Used in 1 widget and the report filter'.toLowerCase());
    expect(data.details).toHaveLength(2);
    expect(data.details![0]).toContain('Sales log');
    expect(data.confirmLabel).toBe('Delete anyway');
    expect(data.danger).toBe(true);
    expect(deleteColumn).toHaveBeenCalledOnce();
  });

  it('reassures only when it actually checked that nothing uses the column', () => {
    const { el } = render({});

    deleteButton(el, 'Notes').click();

    expect(confirmation().message).toContain('Nothing in this report uses it.');
    expect(confirmation().details).toBeUndefined();
    expect(confirmation().confirmLabel).toBe('Delete');
  });

  it('says so when it could not check, rather than implying the column is safe to remove', () => {
    const { el } = render({});
    known.set(false);

    deleteButton(el, 'Notes').click();

    expect(confirmation().message).toContain("couldn't check");
    expect(confirmation().message).not.toContain('Nothing in this report');
  });
});

describe('DatasetColumnsPanelComponent changing a column type', () => {
  let open: ReturnType<typeof vi.fn>;
  let retypeColumn: ReturnType<typeof vi.fn>;
  let writeValue: ReturnType<typeof vi.fn>;
  let closed: boolean;

  const impact = (breaks: ColumnUse[]): ColumnTypeImpact => ({ from: 'double', to: 'string', breaks });

  function render(check: Observable<ColumnTypeImpact> | null) {
    closed = true;
    open = vi.fn(() => ({ closed: of(closed) }));
    retypeColumn = vi.fn();
    writeValue = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Dialog, useValue: { open } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reportId: '7' }) } } },
        {
          provide: DatasetsStore,
          useValue: {
            columns: signal([{ ...col('revenue', 'Revenue'), type: 'double' }]),
            schemaLoading: signal(false),
            columnUses: () => [],
            columnUsageKnown: signal(true),
            columnTypeImpact: vi.fn(() => check),
            retypeColumn,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(DatasetColumnsPanelComponent);
    fixture.detectChanges();
    const change = (to: DatasetColumnType) =>
      (fixture.componentInstance as unknown as { retype: (c: DatasetColumn, t: DatasetColumnType, s: unknown) => void }).retype(
        { ...col('revenue', 'Revenue'), type: 'double' },
        to,
        { writeValue },
      );
    return { change };
  }

  const confirmation = () => open.mock.calls.at(-1)![1].data as ConfirmDialogData;
  const broken = (over: Partial<ColumnUse> = {}): ColumnUse => ({
    kind: 'widget',
    widgetId: 'w1',
    widgetTitle: 'Revenue by region',
    widgetType: 'barChart',
    tabName: 'Overview',
    roles: ['Value column needs a number'],
    ...over,
  });

  beforeEach(() => TestBed.resetTestingModule());

  it('changes the type straight away when nothing would break', () => {
    const { change } = render(of(impact([])));

    change('int');

    expect(retypeColumn).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
  });

  it('does nothing when the type is unchanged', () => {
    const { change } = render(of(impact([])));

    change('double');

    expect(retypeColumn).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('names what would break and asks for a stronger confirmation before changing it', () => {
    const { change } = render(of(impact([broken(), broken({ kind: 'reportFilter', widgetId: null, widgetTitle: null, widgetType: null, tabName: null, roles: ['Filter condition "Contains" is not available for decimal columns'] })])));

    change('string');

    const data = confirmation();
    expect(data.title).toBe('Change would break widgets');
    expect(data.message).toContain('from decimal to text');
    expect(data.message).toContain('1 widget and the report filter');
    expect(data.details).toHaveLength(2);
    expect(data.details![0]).toContain('Revenue by region');
    expect(data.details![0]).toContain('Value column needs a number');
    expect(data.confirmLabel).toBe('Change anyway');
    expect(retypeColumn).toHaveBeenCalledWith(expect.anything(), 'string');
  });

  it('puts the dropdown back and changes nothing when the reader cancels', () => {
    const { change } = render(of(impact([broken()])));
    closed = false;

    change('string');

    expect(retypeColumn).not.toHaveBeenCalled();
    expect(writeValue).toHaveBeenCalledWith('double');
  });

  it('confirms with that said, rather than silently proceeding, when the check cannot be made', () => {
    const { change } = render(throwError(() => new Error('down')));

    change('int');

    expect(confirmation().message).toContain("couldn't check");
    expect(confirmation().details).toBeUndefined();
    expect(retypeColumn).toHaveBeenCalledOnce();
  });
});
