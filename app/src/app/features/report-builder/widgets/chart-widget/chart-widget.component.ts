import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter.model';
import { ChartWidgetConfig } from '../../../../core/models/report.model';
import { widgetTypeDescriptor } from '../../../../core/models/widget-catalog';
import { BarChartQueryResult, ChartQueryResult } from '../../../../core/models/widget-query.model';
import { resolveWidgetFilter } from '../effective-filter';
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
  /** The report-level filter for this chart's dataset, if any. */
  readonly reportFilter = input<FilterGroup | null>(null);
  /**
   * The widget's own filter, supplied by the host rather than read from
   * {@link config} so the builder can leave out conditions the user hasn't
   * finished typing. Defaults to whatever the config carries.
   */
  readonly widgetFilter = input<FilterGroup | null | undefined>(undefined);

  private readonly datasetApi = inject(DatasetApiService);

  protected readonly datasetId = computed(() => this.config().datasetId);

  /** Icon for the empty state, so each chart kind shows its own glyph. */
  protected readonly placeholderIcon = computed(() => widgetTypeDescriptor(this.config().type).icon);

  /** Report-level and widget-level filters, as the single tree sent to the API. */
  private readonly effectiveFilter = computed(() =>
    resolveWidgetFilter(this.reportFilter(), this.widgetFilter(), this.config().filter),
  );

  private readonly source = new WidgetDataSource<ChartQueryResult | BarChartQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () =>
      buildChartQuery(this.datasetApi, this.datasetId(), this.config(), this.effectiveFilter()),
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
    // Points reload whenever the dataset, its axes, the aggregate, either filter,
    // the tolerance bands, or the tooltip columns change — the server needs all
    // of these to build a response.
    effect(() => {
      const config = this.config();
      const datasetId = this.datasetId();
      config.xColumnId;
      config.yColumnId;
      config.seriesColumnId;
      config.toleranceBands;
      config.tooltipColumns;
      if (config.type === 'barChart') config.aggregate;
      this.effectiveFilter();
      this.datasetVersion();

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
