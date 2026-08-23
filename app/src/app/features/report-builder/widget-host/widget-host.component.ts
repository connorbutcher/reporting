import { Component, computed, inject, input, output } from '@angular/core';
import { FilterGroup, combineFilters } from '../../../core/models/filter.model';
import { SortDirection } from '../../../core/models/report.model';
import { GridPreview } from '../grid.util';
import { ChartWidgetModel, DataTableWidgetModel, WidgetModel } from '../models/widget.model';
import { ReportBuilderStore } from '../report-builder.store';
import { WidgetOutletDirective, WidgetOutputHandler } from '../widgets/widget-outlet.directive';
import { WidgetDragDirective } from './widget-drag.directive';
import { WidgetResizeDirective } from './widget-resize.directive';

@Component({
  selector: 'app-widget-host',
  imports: [WidgetOutletDirective, WidgetDragDirective, WidgetResizeDirective],
  templateUrl: './widget-host.component.html',
  styleUrl: './widget-host.component.scss',
  host: {
    class: 'widget-host',
    '[style.grid-column]': 'gridColumn()',
    '[style.grid-row]': 'gridRow()',
  },
})
export class WidgetHostComponent {
  readonly widget = input.required<WidgetModel>();
  readonly gridPreview = output<GridPreview | null>();

  private readonly store = inject(ReportBuilderStore);

  protected readonly selected = computed(() =>
    this.store.selectedWidgetIds().includes(this.widget().id),
  );
  /** The one the side panel is editing, when several are selected at once. */
  protected readonly primary = computed(() => this.store.selectedWidgetId() === this.widget().id);
  protected readonly issues = computed(
    () => this.store.issuesByWidget().get(this.widget().id) ?? [],
  );
  protected readonly hasError = computed(() => this.issues().some((i) => i.severity === 'error'));
  protected readonly issueLabel = computed(() => {
    const count = this.issues().length;
    return `${count} issue${count === 1 ? '' : 's'} on this widget — click to review`;
  });

  protected readonly gridColumn = computed(
    () => `${this.widget().x() + 1} / span ${this.widget().w()}`,
  );
  protected readonly gridRow = computed(
    () => `${this.widget().y() + 1} / span ${this.widget().h()}`,
  );
  protected readonly title = computed(() => this.widget().label());
  protected readonly showTitle = computed(() => this.widget().showTitle());

  /** The widget's current DTO — its config reflects live edits — for the render outlet. */
  protected readonly widgetDto = computed(() => this.widget().toDto());

  // Narrowed once here rather than in the template, since Angular's control
  // flow can't infer that two separate `widget()` calls refer to the same value.
  private readonly tableModel = computed(() => {
    const widget = this.widget();
    return widget instanceof DataTableWidgetModel ? widget : null;
  });
  private readonly chartModel = computed(() => {
    const widget = this.widget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  protected readonly datasetVersion = computed(() => this.store.datasetVersion());

  /** Wired by name onto the created widget's outputs; only a table emits these. */
  protected readonly widgetOutputs: Record<string, WidgetOutputHandler> = {
    sortChange: (sort: { columnId: string; direction: SortDirection }) => this.onSortChange(sort),
    columnResize: (widths: { columnId: string; width: number }[]) => this.onColumnResize(widths),
  };

  /** Only the finished conditions, so a half-typed row doesn't blank the table. */
  protected readonly widgetFilter = computed(() => this.tableModel()?.filter.toQueryDto() ?? null);

  /** The report-level filter for a table's dataset, layered over its own. */
  protected readonly reportFilter = computed(() => {
    const datasetId = this.tableModel()?.datasetId();
    if (!datasetId) return null;
    return this.reportFilterFor(datasetId);
  });

  /**
   * Each chart binding's resolved, query-safe filter — the report filter for the
   * binding's dataset layered under the binding's own finished conditions — keyed
   * by binding id, so every overlaid dataset narrows its own rows.
   */
  protected readonly bindingFilters = computed(() => {
    const chart = this.chartModel();
    if (!chart) return null;

    const filters: Record<string, FilterGroup | null> = {};
    for (const binding of chart.bindings()) {
      const own = binding.filter.toQueryDto();
      const report = this.reportFilterFor(binding.datasetId());
      filters[binding.id] = combineFilters(report, own);
    }
    return filters;
  });

  private reportFilterFor(datasetId: number | null): FilterGroup | null {
    if (!datasetId) return null;
    return this.store.model()?.reportFilter(datasetId)?.group.toQueryDto() ?? null;
  }

  /** Ctrl/⌘ or shift extends the selection; a plain click replaces it. */
  protected select(event: PointerEvent | MouseEvent): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      this.store.toggleWidgetSelection(this.widget().id);
      return;
    }
    // Clicking a widget already in a multi-selection keeps the group intact so
    // the whole thing can be dragged.
    if (this.store.hasMultiSelection() && this.store.isSelected(this.widget().id)) return;
    this.store.selectWidget(this.widget().id);
  }

  protected showIssues(): void {
    this.store.selectOnly(this.widget().id);
    this.store.navigate({ kind: 'issues' });
  }

  protected onSortChange(sort: { columnId: string; direction: SortDirection }): void {
    this.tableModel()?.setSort(sort.columnId, sort.direction);
  }

  /**
   * Persists widths after a drag-resize so the layout survives a reload. This
   * only ever updates widths on columns the user already chose: it must never
   * add or reorder columns, since layout reflows can trigger it too.
   */
  protected onColumnResize(widths: { columnId: string; width: number }[]): void {
    const table = this.tableModel();
    if (!table?.appearance.resizableColumns()) return;
    table.applyColumnWidths(widths);
  }
}
