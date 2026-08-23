import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter';
import { ChartWidgetConfig, readChartBindings } from '../../../../core/models/report';
import { widgetTypeDescriptor } from '../../../../core/models/widget-catalog';
import { BarChartQueryResult, ChartQueryResult } from '../../../../core/models/widget-query';
import { WidgetDataSource } from '../widget-data-source';
import { buildBarOption } from './bar-option';
import { buildChartQuery } from './chart-query';
import { buildPointOption } from './point-option';

/**
 * Renders a scatter, line, or bar chart. This host owns only the shared
 * plumbing — inputs, the data source, and reload triggers; each chart kind's
 * query shape lives in {@link buildChartQuery} and its echarts options in
 * {@link buildPointOption}/{@link buildBarOption}.
 */
@Component({
  selector: 'app-chart-widget',
  imports: [NgxEchartsDirective],
  templateUrl: './chart-widget.component.html',
  styleUrl: './chart-widget.component.scss',
})
export class ChartWidgetComponent {
  readonly config = input.required<ChartWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  readonly datasetVersion = input(0);
  /**
   * Each binding's fully-resolved, query-safe filter (the report-level filter for
   * its dataset layered under the binding's own), keyed by binding id. Resolved by
   * the host so the builder can drop conditions the user is still typing; a binding
   * absent from the map plots unfiltered.
   */
  readonly bindingFilters = input<Record<string, FilterGroup | null> | null>(null);

  private readonly datasetApi = inject(DatasetApiService);

  /**
   * The first *bound* binding's dataset drives the loaded schema — it names the
   * shared axes. Using the first bound one (not strictly bindings[0]) means the
   * chart still renders when an earlier binding is left unconfigured.
   */
  protected readonly datasetId = computed(
    () => readChartBindings(this.config()).find((b) => b.datasetId)?.datasetId ?? null,
  );

  /** Icon for the empty state, so each chart kind shows its own glyph. */
  protected readonly placeholderIcon = computed(() => widgetTypeDescriptor(this.config().type).icon);

  /** Per-binding response cache so editing one binding doesn't refetch the others. */
  private readonly queryCache = new Map<string, ChartQueryResult>();
  /** Tracks the dataset version the cache was built at, to drop it when columns change. */
  private cacheVersion = -1;

  private readonly source = new WidgetDataSource<ChartQueryResult | BarChartQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () =>
      buildChartQuery(this.datasetApi, this.config(), this.bindingFilters(), this.queryCache),
  });

  protected readonly loading = this.source.loading;
  protected readonly error = this.source.error;

  /** Null until there's a dataset and enough columns bound to actually plot. */
  protected readonly chartOption = computed<EChartsCoreOption | null>(() => {
    const config = this.config();
    const columns = this.source.columns();
    const data = this.source.result();
    return config.type === 'barChart'
      ? buildBarOption(config, data as BarChartQueryResult | null, columns)
      : buildPointOption(config, data as ChartQueryResult | null, columns);
  });

  constructor() {
    // Reloads whenever anything the server needs changes: the bindings (dataset,
    // axes, colour-by, aggregate), the tolerance bands, or the tooltip columns —
    // all carried on `config`, which is a fresh object on every edit — or the
    // resolved per-binding filters.
    effect(() => {
      const config = this.config();
      const datasetId = this.datasetId();
      this.bindingFilters();
      const version = this.datasetVersion();

      // A column-configuration change can alter query results, so the cache built
      // at an older version is no longer trustworthy — drop it.
      if (version !== this.cacheVersion) {
        this.cacheVersion = version;
        untracked(() => this.queryCache.clear());
      }

      if (!datasetId) {
        untracked(() => {
          this.source.result.set(null);
          this.source.loading.set(false);
        });
        return;
      }

      untracked(() => {
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadDebounced();
      });
    });
  }
}
