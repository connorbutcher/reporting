import { Component, Signal, computed, input, output } from '@angular/core';
import { ROW_HEIGHT, GRID_GAP } from '../../report-builder/grid.util';
import { ReportRevisionContent, Tab, Widget, readChartBindings } from '../../../core/models/report';
import { isChartWidget } from '../../../core/models/widget-catalog';
import { FilterGroup, combineFilters, countConditions } from '../../../core/models/filter';
import { WidgetOutletDirective } from '../../report-builder/widgets/widget-outlet.directive';
import { chartBindingKey } from '../report-view-filters';

/** Renders a report's widgets on the grid with no drag, resize, or selection chrome. */
@Component({
  selector: 'app-readonly-report-grid',
  imports: [WidgetOutletDirective],
  templateUrl: './readonly-report-grid.component.html',
  styleUrl: './readonly-report-grid.component.scss',
})
export class ReadonlyReportGridComponent {
  readonly content = input.required<ReportRevisionContent>();

  /** The tab whose grid and widgets are shown; report-level filters still come from {@link content}. */
  readonly tab = input.required<Tab>();

  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly gridGap = GRID_GAP;

  /**
   * Session overrides from the viewer's filter panel. Page filters are keyed by
   * the stringified dataset id; widget filters by widget id for a table, and by
   * {@link chartBindingKey} for each chart binding. Left unset, the grid falls
   * back to what the version published — so it still renders correctly on its own.
   *
   * Each value is a signal, not a plain `FilterGroup`, so reading only the one a
   * widget actually needs tracks only that filter's own changes — a `Record`
   * rebuilt whole on every edit would hand every widget a new reference and
   * reload the entire report each time any single filter changed.
   */
  readonly pageFilters = input<ReadonlyMap<string, Signal<FilterGroup | null>> | null>(null);
  readonly widgetFilters = input<ReadonlyMap<string, Signal<FilterGroup | null>> | null>(null);

  /** A widget's filter button was clicked; the host decides where to show it. */
  readonly filterWidget = output<string>();

  /** Only a table or chart bound to a dataset has anything to filter. */
  protected canFilter(widget: Widget): boolean {
    if (widget.type === 'dataTable') return !!widget.config.datasetId;
    return isChartWidget(widget) && readChartBindings(widget.config).some((b) => !!b.datasetId);
  }

  /** Conditions across this widget's own filters — what the button badge shows. */
  protected conditionCount(widget: Widget): number {
    if (isChartWidget(widget)) {
      return readChartBindings(widget.config).reduce(
        (n, b) => (b.datasetId ? n + countConditions(this.bindingOwnFilter(widget.id, b.id, b.filter)) : n),
        0,
      );
    }
    return countConditions(this.widgetFilterFor(widget));
  }

  /** So a published report narrows a table's rows exactly as it did in the builder. */
  protected reportFilterFor(widget: Widget): FilterGroup | null {
    return this.reportFilterForDataset(this.datasetIdOf(widget));
  }

  protected widgetFilterFor(widget: Widget): FilterGroup | null {
    const override = this.widgetFilters()?.get(widget.id);
    if (override) return override();
    return widget.type === 'dataTable' ? widget.config.filter : null;
  }

  /**
   * Every chart's per-binding resolved filters (page filter for the binding's
   * dataset layered under its own session-override-or-published filter), keyed by
   * widget id then binding id. Memoized in a computed so a template binding hands
   * the outlet a *stable* reference across change-detection passes — building a
   * fresh object per call fed a new input every pass and spun change detection
   * into an infinite loop (NG0103). Recomputes only when content or a session
   * filter actually changes.
   */
  private readonly chartBindingFilters = computed(() => {
    const map = new Map<string, Record<string, FilterGroup | null>>();
    for (const widget of this.tab().widgets) {
      if (!isChartWidget(widget)) continue;
      const filters: Record<string, FilterGroup | null> = {};
      for (const binding of readChartBindings(widget.config)) {
        if (!binding.datasetId) continue;
        const report = this.reportFilterForDataset(binding.datasetId);
        const own = this.bindingOwnFilter(widget.id, binding.id, binding.filter);
        filters[binding.id] = combineFilters(report, own);
      }
      map.set(widget.id, filters);
    }
    return map;
  });

  /** A chart's per-binding filters; null for a non-chart (which filters through report/widgetFilterFor). */
  protected bindingFiltersFor(widget: Widget): Record<string, FilterGroup | null> | null {
    return this.chartBindingFilters().get(widget.id) ?? null;
  }

  /** A binding's own filter: the reader's session override if any, else what was published. */
  private bindingOwnFilter(
    widgetId: string,
    bindingId: string,
    published: FilterGroup | null,
  ): FilterGroup | null {
    const override = this.widgetFilters()?.get(chartBindingKey(widgetId, bindingId));
    return override ? override() : published;
  }

  private reportFilterForDataset(datasetId: number | null): FilterGroup | null {
    if (!datasetId) return null;
    const override = this.pageFilters()?.get(String(datasetId));
    if (override) return override();
    return this.content().filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
  }

  /** The dataset a table is bound to; charts filter per binding, not through this. */
  private datasetIdOf(widget: Widget): number | null {
    return widget.type === 'dataTable' ? widget.config.datasetId : null;
  }
}
