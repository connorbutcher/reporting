import { Dialog } from '@angular/cdk/dialog';
import { Component, Signal, computed, inject, input, output } from '@angular/core';
import { GridLayout } from '../../report-builder/grid/grid-layout';
import {
  ReportRevisionContent,
  Tab,
  Widget,
  ChartConfigs,
  WidgetFragment,
} from '../../../core/models/report';
import { WidgetCatalog } from '../../../core/models/widget-catalog/widget-catalog';
import { FilterGroup, FilterTrees } from '../../../core/models/filter';
import { ScrollToFragmentDirective } from '../../../shared/directives/scroll-to-fragment.directive';
import { WidgetExportActionsComponent } from '../../report-builder/widgets/widget-export-actions/widget-export-actions.component';
import { WidgetFullscreenDialogComponent } from '../../report-builder/widgets/widget-fullscreen-dialog/widget-fullscreen-dialog.component';
import { WidgetFullscreenDialogData } from '../../report-builder/widgets/widget-fullscreen-dialog/widget-fullscreen-dialog-data';
import { WidgetOutletDirective } from '../../report-builder/widgets/widget-outlet.directive';
import { WidgetOutputHandler } from '../../report-builder/widgets/widget-output-handler';
import { ReportComments } from '../comments/report-comments';
import { ViewFilterEntryFactory } from '../filters/view-filter-entry-factory';

@Component({
  selector: 'app-readonly-report-grid',
  imports: [WidgetExportActionsComponent, WidgetOutletDirective, ScrollToFragmentDirective],
  templateUrl: './readonly-report-grid.component.html',
  styleUrl: './readonly-report-grid.component.scss',
})
export class ReadonlyReportGridComponent {
  private static readonly NO_OUTPUTS: Record<string, WidgetOutputHandler> = {};

  public readonly content = input.required<ReportRevisionContent>();

  public readonly tab = input.required<Tab>();

  public readonly rowHeight = GridLayout.ROW_HEIGHT;

  public readonly gridGap = GridLayout.GRID_GAP;

  /**
   * Session overrides, keyed by dataset id (page), widget id (table) or
   * {@link ViewFilterEntryFactory.chartBindingKey}. Unset falls back to what was published. Each value
   * is a signal so a widget only reloads when its own filter changes.
   */
  public readonly pageFilters = input<ReadonlyMap<string, Signal<FilterGroup | null>> | null>(null);

  public readonly widgetFilters = input<ReadonlyMap<string, Signal<FilterGroup | null>> | null>(
    null,
  );

  public readonly filterWidget = output<string>();

  public readonly commentsRequest = output<string>();

  private readonly comments = inject(ReportComments);

  private readonly dialog = inject(Dialog);

  private readonly widgetOutputs = new Map<string, Record<string, WidgetOutputHandler>>();

  /**
   * Per-binding resolved filters by widget then binding id. A computed, so the outlet gets a stable
   * reference (a fresh object each pass loops change detection, NG0103).
   */
  private readonly chartBindingFilters = computed(() => {
    const map = new Map<string, Record<string, FilterGroup | null>>();
    for (const widget of this.tab().widgets) {
      if (!WidgetCatalog.isChartWidget(widget)) {
        continue;
      }
      const filters: Record<string, FilterGroup | null> = {};
      for (const binding of ChartConfigs.bindings(widget.config)) {
        if (!binding.datasetId) {
          continue;
        }
        const report = this.reportFilterForDataset(binding.datasetId);
        const own = this.bindingOwnFilter(widget.id, binding.id, binding.filter);
        filters[binding.id] = FilterTrees.combine(report, own);
      }
      map.set(widget.id, filters);
    }
    return map;
  });

  /** Cached per widget so the outlet gets the same object on every change-detection pass. */
  public outputsFor(widget: Widget): Record<string, WidgetOutputHandler> {
    if (!this.canFilter(widget)) {
      return ReadonlyReportGridComponent.NO_OUTPUTS;
    }
    let outputs = this.widgetOutputs.get(widget.id);
    if (!outputs) {
      outputs = { filterRequest: () => this.filterWidget.emit(widget.id) };
      this.widgetOutputs.set(widget.id, outputs);
    }
    return outputs;
  }

  public fragmentFor(widget: Widget): string {
    return WidgetFragment.forWidget(widget.id);
  }

  public isExportable(widget: Widget): boolean {
    return WidgetCatalog.isExportableType(widget.type);
  }

  public openFullscreen(widget: Widget): void {
    this.dialog.open<void, WidgetFullscreenDialogData>(WidgetFullscreenDialogComponent, {
      data: {
        widget: () => widget,
        title: () => widget.config.title || widget.type,
        reportFilter: () => this.reportFilterFor(widget),
        widgetFilter: () => this.widgetFilterFor(widget),
        bindingFilters: () => this.bindingFiltersFor(widget),
        datasetVersion: () => 0,
        widgetOutputs: this.outputsFor(widget),
      },
    });
  }

  public canFilter(widget: Widget): boolean {
    if (widget.type === 'dataTable' || widget.type === 'pivotTable' || widget.type === 'kpi') {
      return !!widget.config.datasetId;
    }
    return (
      WidgetCatalog.isChartWidget(widget) &&
      ChartConfigs.bindings(widget.config).some((b) => !!b.datasetId)
    );
  }

  public commentCount(widget: Widget): number {
    return this.comments.countFor(widget.id);
  }

  public conditionCount(widget: Widget): number {
    if (WidgetCatalog.isChartWidget(widget)) {
      return ChartConfigs.bindings(widget.config).reduce(
        (n, b) =>
          b.datasetId
            ? n + FilterTrees.countConditions(this.bindingOwnFilter(widget.id, b.id, b.filter))
            : n,
        0,
      );
    }
    return FilterTrees.countConditions(this.widgetFilterFor(widget));
  }

  public reportFilterFor(widget: Widget): FilterGroup | null {
    return this.reportFilterForDataset(this.datasetIdOf(widget));
  }

  public widgetFilterFor(widget: Widget): FilterGroup | null {
    const override = this.widgetFilters()?.get(widget.id);
    if (override) {
      return override();
    }
    return widget.type === 'dataTable' || widget.type === 'pivotTable' || widget.type === 'kpi'
      ? widget.config.filter
      : null;
  }

  public bindingFiltersFor(widget: Widget): Record<string, FilterGroup | null> | null {
    return this.chartBindingFilters().get(widget.id) ?? null;
  }

  private bindingOwnFilter(
    widgetId: string,
    bindingId: string,
    published: FilterGroup | null,
  ): FilterGroup | null {
    const override = this.widgetFilters()?.get(
      ViewFilterEntryFactory.chartBindingKey(widgetId, bindingId),
    );
    return override ? override() : published;
  }

  private reportFilterForDataset(datasetId: number | null): FilterGroup | null {
    if (!datasetId) {
      return null;
    }
    const override = this.pageFilters()?.get(String(datasetId));
    if (override) {
      return override();
    }
    return this.content().filters?.find((f) => f.datasetId === datasetId)?.filter ?? null;
  }

  private datasetIdOf(widget: Widget): number | null {
    return widget.type === 'dataTable' || widget.type === 'pivotTable' || widget.type === 'kpi'
      ? widget.config.datasetId
      : null;
  }
}
