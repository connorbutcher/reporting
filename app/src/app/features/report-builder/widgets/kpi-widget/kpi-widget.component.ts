import { DecimalPipe } from '@angular/common';
import { Component, Signal, computed, effect, inject, input, untracked } from '@angular/core';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { combineFilters, FilterGroup } from '../../../../core/models/filter';
import { KpiComparisonDirection, KpiWidgetConfig } from '../../../../core/models/report';
import { KpiQueryResult } from '../../../../core/models/widget-query';
import { resolveWidgetFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';

/** Whether an improving comparison should render green (up) or red (down), per the widget's config. */
function trendIsGood(delta: number, direction: KpiComparisonDirection): boolean | null {
  if (direction === 'neutral') return null;
  if (delta === 0) return null;
  return direction === 'higherIsBetter' ? delta > 0 : delta < 0;
}

@Component({
  selector: 'app-kpi-widget',
  imports: [DecimalPipe],
  templateUrl: './kpi-widget.component.html',
  styleUrl: './kpi-widget.component.scss',
})
export class KpiWidgetComponent {
  public readonly config = input.required<KpiWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  public readonly datasetVersion = input(0);
  /** The report-level filter for this widget's dataset, layered over its own. */
  public readonly reportFilter = input<FilterGroup | null>(null);
  /** The widget's own filter, supplied by the host so half-typed conditions can be dropped. */
  public readonly widgetFilter = input<FilterGroup | null | undefined>(undefined);

  public readonly datasetId = computed(() => this.config().datasetId);
  /** True once a dataset is bound and at least one measure is configured. */
  public readonly configured = computed(
    () => !!this.config().datasetId && this.config().measures.length > 0,
  );

  public readonly value = computed(() => this.source.result()?.formattedValue ?? null);
  public readonly errorMessage = computed(() => this.source.result()?.error ?? null);
  public readonly status = computed(() => this.source.result()?.status ?? 'neutral');

  /** The trend line under the value — null when there's no comparison to show. */
  public readonly trend = computed(() => {
    const data = this.source.result();
    if (!data || data.delta === null || data.comparisonValue === null) return null;
    return {
      formattedComparison: data.formattedComparisonValue,
      delta: data.delta,
      deltaPercent: data.deltaPercent,
      good: trendIsGood(data.delta, this.config().comparisonDirection),
    };
  });

  public readonly isTruncated = computed(() => !!this.source.result()?.truncated);

  private readonly datasetApi = inject(DatasetApiService);

  private readonly effectiveFilter = computed(() =>
    resolveWidgetFilter(this.reportFilter(), this.widgetFilter(), this.config().filter),
  );

  private readonly source = new WidgetDataSource<KpiQueryResult>({
    datasetId: this.datasetId,
    version: this.datasetVersion,
    api: this.datasetApi,
    fetch: () => {
      const config = this.config();
      const datasetId = config.datasetId;
      if (!datasetId || config.measures.length === 0) return null;

      return this.datasetApi.queryKpi(datasetId, {
        filter: this.effectiveFilter(),
        measures: config.measures.map((m) => ({
          alias: m.alias,
          columnId: m.columnId,
          aggregate: m.aggregate,
          filter: m.filter,
        })),
        formula: config.formula,
        comparisonFilter: config.comparisonFilter
          ? combineFilters(this.reportFilter(), config.comparisonFilter)
          : null,
        numberFormat: config.numberFormat,
        threshold: config.threshold,
      });
    },
  });

  constructor() {
    // Switching datasets reloads immediately; the config-driven reload below debounces.
    effect(() => {
      const ready = this.configured();
      this.datasetVersion();

      if (!ready) {
        untracked(() => {
          this.source.result.set(null);
          this.source.loading.set(false);
        });
        return;
      }

      untracked(() => {
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadNow();
      });
    });

    // Re-aggregate whenever the measures, formula, comparison, or filters change.
    effect(() => {
      if (!this.configured()) return;
      this.effectiveFilter();
      this.config().measures;
      this.config().formula;
      this.config().comparisonFilter;
      this.config().comparisonDirection;
      this.config().threshold;
      this.config().numberFormat;

      untracked(() => {
        this.source.loading.set(true);
        this.source.error.set(false);
        this.source.reloadDebounced();
      });
    });
  }

  /** Retries the last query after a load failure. */
  public retry(): void {
    this.source.error.set(false);
    this.source.loading.set(true);
    this.source.reloadNow();
  }

  /** Source-derived signals, exposed as getters so their backing field stays below the public block. */
  public get loading(): Signal<boolean> {
    return this.source.loading;
  }
  public get error(): Signal<boolean> {
    return this.source.error;
  }
}
