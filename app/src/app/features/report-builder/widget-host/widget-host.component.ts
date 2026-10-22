import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject, input, output } from '@angular/core';
import { FilterGroup, FilterTrees } from '../../../core/models/filter';
import { SortDirection, WidgetFragment } from '../../../core/models/report';
import { WidgetCatalog } from '../../../core/models/widget-catalog/widget-catalog';
import { ScrollToFragmentDirective } from '../../../shared/directives/scroll-to-fragment.directive';
import { GridPreview } from '../grid/grid-preview';
import {
  ChartWidgetModel,
  DataTableWidgetModel,
  KpiWidgetModel,
  PivotTableWidgetModel,
  WidgetModel,
} from '../models/widget.model';
import { DatasetSchema } from '../state/dataset-schema';
import { PanelNavigation } from '../state/panel-navigation';
import { ReportSession } from '../state/report-session';
import { WidgetSelection } from '../state/widget-selection';
import { WidgetExportActionsComponent } from '../widgets/widget-export-actions/widget-export-actions.component';
import { WidgetFullscreenDialogComponent } from '../widgets/widget-fullscreen-dialog/widget-fullscreen-dialog.component';
import { WidgetFullscreenDialogData } from '../widgets/widget-fullscreen-dialog/widget-fullscreen-dialog-data';
import { WidgetOutletDirective } from '../widgets/widget-outlet.directive';
import { WidgetOutputHandler } from '../widgets/widget-output-handler';
import { WidgetDragDirective } from './widget-drag.directive';
import { WidgetResizeDirective } from './widget-resize.directive';

@Component({
  selector: 'app-widget-host',
  imports: [
    WidgetExportActionsComponent,
    WidgetOutletDirective,
    WidgetDragDirective,
    WidgetResizeDirective,
    ScrollToFragmentDirective,
  ],
  templateUrl: './widget-host.component.html',
  styleUrl: './widget-host.component.scss',
  host: {
    class: 'widget-host',
    '[style.grid-column]': 'gridColumn()',
    '[style.grid-row]': 'gridRow()',
  },
})
export class WidgetHostComponent {
  public readonly widget = input.required<WidgetModel>();
  public readonly gridPreview = output<GridPreview | null>();

  public readonly selected = computed(() =>
    this.selection.selectedWidgetIds().includes(this.widget().id),
  );

  /** The widget the side panel edits when several are selected. */
  public readonly primary = computed(() => this.selection.selectedWidgetId() === this.widget().id);

  public readonly issues = computed(
    () => this.session.issuesByWidget().get(this.widget().id) ?? [],
  );

  public readonly hasError = computed(() => this.issues().some((i) => i.severity === 'error'));

  public readonly issueLabel = computed(() => {
    const count = this.issues().length;
    return `${count} issue${count === 1 ? '' : 's'} on this widget — click to review`;
  });

  public readonly gridColumn = computed(
    () => `${this.widget().x() + 1} / span ${this.widget().w()}`,
  );

  public readonly gridRow = computed(() => `${this.widget().y() + 1} / span ${this.widget().h()}`);
  public readonly fragment = computed(() => WidgetFragment.forWidget(this.widget().id));
  public readonly title = computed(() => this.widget().label());
  public readonly showTitle = computed(() => this.widget().showTitle());
  public readonly exportable = computed(() => WidgetCatalog.isExportableType(this.widget().type));

  /** Reflects live edits. */
  public readonly widgetDto = computed(() => this.widget().toDto());
  public readonly datasetVersion = computed(() => this.schema.datasetVersion());

  /** Bound by name to the widget's outputs; only a table emits these. */
  public readonly widgetOutputs: Record<string, WidgetOutputHandler> = {
    sortChange: (sort: { columnId: string; direction: SortDirection }) => this.onSortChange(sort),
    columnResize: (widths: { columnId: string; width: number }[]) => this.onColumnResize(widths),
    columnReorder: (move: { draggedColumnId: string; targetColumnId: string }) =>
      this.onColumnReorder(move),
  };

  /** Only finished conditions, so a half-typed row doesn't blank the widget. */
  public readonly widgetFilter = computed(
    () => this.filterableModel()?.filter.toQueryDto() ?? null,
  );

  /** The report-level filter for a table's or pivot's dataset. */
  public readonly reportFilter = computed(() => {
    const datasetId = this.filterableModel()?.datasetId();
    if (!datasetId) {
      return null;
    }
    return this.reportFilterFor(datasetId);
  });

  /** Each chart binding's report filter layered under its own finished conditions, keyed by binding id. */
  public readonly bindingFilters = computed(() => {
    const chart = this.chartModel();
    if (!chart) {
      return null;
    }

    const filters: Record<string, FilterGroup | null> = {};
    for (const binding of chart.bindings()) {
      const own = binding.filter.toQueryDto();
      const report = this.reportFilterFor(binding.datasetId());
      filters[binding.id] = FilterTrees.combine(report, own);
    }
    return filters;
  });

  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly navigation = inject(PanelNavigation);
  private readonly schema = inject(DatasetSchema);
  private readonly dialog = inject(Dialog);

  // Narrowed here because template control flow can't tell two `widget()` calls are the same value.
  private readonly tableModel = computed(() => {
    const widget = this.widget();
    return widget instanceof DataTableWidgetModel ? widget : null;
  });

  private readonly chartModel = computed(() => {
    const widget = this.widget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  /** Tables, pivots and KPIs share one dataset-plus-filter wiring. */
  private readonly filterableModel = computed(() => {
    const widget = this.widget();
    return widget instanceof DataTableWidgetModel ||
      widget instanceof PivotTableWidgetModel ||
      widget instanceof KpiWidgetModel
      ? widget
      : null;
  });

  /** Ctrl/⌘ or shift extends the selection. */
  public select(event: PointerEvent | MouseEvent): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      this.navigation.toggleWidgetSelection(this.widget().id);
      return;
    }
    // Keep a multi-selection intact so the group can be dragged.
    if (this.selection.hasMultiSelection() && this.selection.has(this.widget().id)) {
      return;
    }
    this.navigation.selectWidget(this.widget().id);
  }

  public showIssues(): void {
    this.selection.set([this.widget().id]);
    this.navigation.navigate({ kind: 'issues' });
  }

  /** Opens near-fullscreen with the same inputs as the outlet. */
  public openFullscreen(): void {
    this.dialog.open<void, WidgetFullscreenDialogData>(WidgetFullscreenDialogComponent, {
      data: {
        widget: this.widgetDto,
        title: this.title,
        reportFilter: this.reportFilter,
        widgetFilter: this.widgetFilter,
        bindingFilters: this.bindingFilters,
        datasetVersion: this.datasetVersion,
        widgetOutputs: this.widgetOutputs,
      },
    });
  }

  public onSortChange(sort: { columnId: string; direction: SortDirection }): void {
    this.tableModel()?.setSort(sort.columnId, sort.direction);
  }

  public onColumnReorder(move: { draggedColumnId: string; targetColumnId: string }): void {
    this.tableModel()?.reorderColumn(move.draggedColumnId, move.targetColumnId);
  }

  /** Persists resized widths. Only updates existing columns, since layout reflows trigger this too. */
  public onColumnResize(widths: { columnId: string; width: number }[]): void {
    const table = this.tableModel();
    if (!table?.appearance.resizableColumns()) {
      return;
    }
    table.applyColumnWidths(widths);
  }

  private reportFilterFor(datasetId: number | null): FilterGroup | null {
    if (!datasetId) {
      return null;
    }
    return this.session.model()?.reportFilter(datasetId)?.group.toQueryDto() ?? null;
  }
}
