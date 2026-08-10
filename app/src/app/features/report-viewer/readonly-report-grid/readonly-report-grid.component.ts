import { Component, Signal, input, output } from '@angular/core';
import { CELL_SIZE, GRID_GAP } from '../../report-builder/grid.util';
import { ReportRevisionContent, Widget } from '../../../core/models/report.model';
import { FilterGroup, countConditions } from '../../../core/models/filter.model';
import { ChartWidgetComponent } from '../../report-builder/widgets/chart-widget/chart-widget.component';
import { DataTableWidgetComponent } from '../../report-builder/widgets/data-table-widget/data-table-widget.component';
import { StaticTextWidgetComponent } from '../../report-builder/widgets/static-text-widget/static-text-widget.component';

/** Renders a report's widgets on the grid with no drag, resize, or selection chrome. */
@Component({
  selector: 'app-readonly-report-grid',
  imports: [DataTableWidgetComponent, StaticTextWidgetComponent, ChartWidgetComponent],
  templateUrl: './readonly-report-grid.component.html',
  styleUrl: './readonly-report-grid.component.scss',
})
export class ReadonlyReportGridComponent {
  readonly content = input.required<ReportRevisionContent>();

  protected readonly cellSize = CELL_SIZE;
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
    return (widget.type === 'dataTable' || widget.type === 'chart') && !!widget.config.datasetId;
  }

  /** Conditions on this widget's own filter — what the button would open. */
  protected conditionCount(widget: Widget): number {
    return countConditions(this.widgetFilterFor(widget));
  }

  /** So a published report narrows rows exactly as it did in the builder. */
  protected reportFilterFor(datasetId: string | null): FilterGroup | null {
    if (!datasetId) return null;

    const override = this.pageFilters()?.get(datasetId);
    if (override) return override();

    return this.content().filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
  }

  protected widgetFilterFor(widget: Widget): FilterGroup | null {
    const override = this.widgetFilters()?.get(widget.id);
    if (override) return override();

    return widget.type === 'dataTable' || widget.type === 'chart' ? widget.config.filter : null;
  }
}
