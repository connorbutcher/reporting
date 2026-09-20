import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatasetSchema } from '../../../core/models/dataset';
import { ReportRevisionContent } from '../../../core/models/report';
import { FilterBuilderComponent } from '../../report-builder/side-panel/filter-builder/filter-builder.component';
import { ReportViewFilters } from '../filters/report-view-filters';
import { ViewFiltersPanelComponent } from './view-filters-panel.component';
import { WidgetFilterRowComponent } from './widget-filter-row/widget-filter-row.component';

const binding = (id: string, datasetId: number, label: string) => ({
  id,
  datasetId,
  label,
  xColumnId: null,
  yColumnId: null,
  filter: null,
});

/** A table on dataset 7, a chart overlaying datasets 7 and 8, and a chart on dataset 7 alone. */
const CONTENT = {
  reportId: 1,
  name: 'Report',
  notes: null,
  filters: [],
  tabs: [
    {
      id: 't1',
      name: 'Tab',
      order: 0,
      columns: 12,
      rows: 12,
      widgets: [
        {
          id: 'tbl',
          type: 'dataTable',
          config: { type: 'dataTable', datasetId: 7, title: 'Bearings table', columns: [], filter: null },
        },
        {
          id: 'multi',
          type: 'scatterChart',
          config: {
            type: 'scatterChart',
            title: 'Cost vs Time',
            bindings: [binding('b1', 7, 'Cost'), binding('b2', 8, 'Time')],
            toleranceBands: [],
          },
        },
        {
          id: 'solo',
          type: 'scatterChart',
          config: { type: 'scatterChart', title: 'Solo chart', bindings: [binding('b3', 7, '')], toleranceBands: [] },
        },
      ],
    },
  ],
} as unknown as ReportRevisionContent;

const SCHEMAS = {
  7: { id: 7, name: 'Bearings', columns: [] },
  8: { id: 8, name: 'Torque', columns: [] },
} as unknown as Record<number, DatasetSchema>;

describe('ViewFiltersPanelComponent', () => {
  let fixture: ComponentFixture<ViewFiltersPanelComponent>;
  let component: ViewFiltersPanelComponent;
  let filters: ReportViewFilters;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    filters = new ReportViewFilters(CONTENT, signal(SCHEMAS), signal(null));
    fixture = TestBed.createComponent(ViewFiltersPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('filters', filters);
    await fixture.whenStable();
  });

  const widgetRowLabels = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('.section')[1].querySelectorAll('.row .label')].map(
      (el) => (el as HTMLElement).textContent!.trim(),
    );

  const item = (widgetId: string) => filters.widgetItems.find((i) => i.widget.id === widgetId)!;
  const entryFor = (key: string) => filters.widgetEntries.find((e) => e.key === key)!;
  const picker = () => fixture.nativeElement.querySelector('.source-picker') as HTMLElement | null;
  const builders = () => fixture.debugElement.queryAll(By.directive(FilterBuilderComponent));
  const rowFor = (widgetId: string): WidgetFilterRowComponent =>
    fixture.debugElement
      .queryAll(By.directive(WidgetFilterRowComponent))
      .map((d) => d.componentInstance as WidgetFilterRowComponent)
      .find((row) => row.item().widget.id === widgetId)!;

  async function open(widgetId: string): Promise<void> {
    component.openKey.set(widgetId);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('lists each widget once: a multi-dataset chart is one row, not one per dataset', () => {
    expect(widgetRowLabels()).toEqual(['Bearings table', 'Cost vs Time', 'Solo chart']);
  });

  it('shows no dataset picker for a widget with a single dataset', async () => {
    await open('solo');

    expect(picker()).toBeNull();
    expect(builders()).toHaveLength(1);
  });

  it('shows a dataset picker inside a multi-dataset widget once it is opened', async () => {
    expect(picker()).toBeNull();

    await open('multi');

    expect(picker()!.textContent).toContain('Dataset');
  });

  it('opens on the first dataset and edits that dataset’s filter', async () => {
    await open('multi');

    expect(rowFor('multi').entry().key).toBe('multi::b1');
    expect(builders()).toHaveLength(1);
    expect(builders()[0].componentInstance.group()).toBe(entryFor('multi::b1').group);
  });

  it('switches the builder to the dataset the reader picks', async () => {
    await open('multi');

    rowFor('multi').pick('multi::b2');
    await settle();

    expect(builders()).toHaveLength(1);
    expect(builders()[0].componentInstance.group()).toBe(entryFor('multi::b2').group);
  });

  it('remembers the pick when the row is closed and reopened', async () => {
    await open('multi');
    rowFor('multi').pick('multi::b2');

    component.toggleWidget(item('multi'));
    component.toggleWidget(item('multi'));

    expect(rowFor('multi').entry().key).toBe('multi::b2');
  });

  it('opens a widget from the grid’s filter button, which names it by widget id', async () => {
    await open('multi');

    expect(component.isWidgetOpen(item('multi'))).toBe(true);
    expect(component.isWidgetOpen(item('tbl'))).toBe(false);
  });

  it('also opens a single-dataset chart from its binding’s entry key', () => {
    component.openKey.set('solo::b3');

    expect(component.isWidgetOpen(item('solo'))).toBe(true);
  });

  it('closes an open widget when its row is toggled', () => {
    component.openKey.set('multi');

    component.toggleWidget(item('multi'));

    expect(component.openKey()).toBeNull();
  });

  it('opens one page filter at a time, independently of the widget rows', () => {
    const [first, second] = component.pageEntries();
    component.openKey.set('multi');

    component.togglePage(first);
    component.togglePage(second);

    expect(component.isPageOpen(first)).toBe(false);
    expect(component.isPageOpen(second)).toBe(true);
    expect(component.openKey()).toBe('multi');
  });

  it('groups widgets by tab, in tab order', () => {
    expect(component.tabWidgets().map((t) => [t.tabName, t.items.map((i) => i.widget.id)])).toEqual([
      ['Tab', ['tbl', 'multi', 'solo']],
    ]);
  });
});
