import { Component, Signal, input, output } from '@angular/core';
import { ROW_HEIGHT, GRID_GAP } from '../../report-builder/grid.util';
import { ReportRevisionContent, Widget } from '../../../core/models/report.model';
import { isChartWidget } from '../../../core/models/widget-catalog';
import { FilterGroup, countConditions } from '../../../core/models/filter.model';
import { WidgetOutletDirective } from '../../report-builder/widgets/widget-outlet.directive';

/** Renders a report's widgets on the grid with no drag, resize, or selection chrome. */
@Component({
  selector: 'app-readonly-report-grid',
  imports: [WidgetOutletDirective],
  templateUrl: './readonly-report-grid.component.html',
  styleUrl: './readonly-report-grid.component.scss',
})
export class ReadonlyReportGridComponent {
  readonly content = input.required<ReportRevisionContent>();

  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly gridGap = GRID_GAP;

  /**
   * Session overrides from the viewer's filter panel, keyed by dataset id and
   * widget id. Left unset, the grid falls back to what the version published —
   * so it still renders correctly on its own.
   *
   * Each value is a signal, not a plain `FilterGroup`, so reading only the one
   * a widget actually needs tracks only that filter's own changes — a `Record`
   * rebuilt whole on every edit would hand every widget a new reference and
   * reload the entire report each time any single filter changed.
   */
  readonly pageFilters = input<ReadonlyMap<string, Signal<FilterGroup | null>> | null>(null);
  readonly widgetFilters = input<ReadonlyMap<string, Signal<FilterGroup | null>> | null>(null);

  /** A widget's filter button was clicked; the host decides where to show it. */
  readonly filterWidget = output<string>();

  /** Only a table or chart bound to a dataset has anything to filter. */
  protected canFilter(widget: Widget): boolean {
    return (widget.type === 'dataTable' || isChartWidget(widget)) && !!widget.config.datasetId;
  }

  /** Conditions on this widget's own filter — what the button would open. */
  protected conditionCount(widget: Widget): number {
    return countConditions(this.widgetFilterFor(widget));
  }

  /** So a published report narrows rows exactly as it did in the builder. */
  protected reportFilterFor(widget: Widget): FilterGroup | null {
    const datasetId = this.datasetIdOf(widget);
    if (!datasetId) return null;

    // Page filters are keyed by the stringified dataset id (see ReportViewFilters).
    const override = this.pageFilters()?.get(String(datasetId));
    if (override) return override();

    return this.content().filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
  }

  protected widgetFilterFor(widget: Widget): FilterGroup | null {
    const override = this.widgetFilters()?.get(widget.id);
    if (override) return override();

    return widget.type === 'dataTable' || isChartWidget(widget) ? widget.config.filter : null;
  }

  /** The dataset a widget is bound to, or null for a kind that isn't (e.g. static text). */
  private datasetIdOf(widget: Widget): number | null {
    return widget.type === 'dataTable' || isChartWidget(widget) ? widget.config.datasetId : null;
  }
}
