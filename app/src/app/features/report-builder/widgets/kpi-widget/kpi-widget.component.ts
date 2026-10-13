import { Component, Signal, computed, effect, inject, input, untracked } from '@angular/core';
import { DatasetApiService } from '../../../../core/api/dataset-api.service';
import { FilterGroup } from '../../../../core/models/filter';
import { KpiWidgetConfig } from '../../../../core/models/report';
import { KpiQueryResult } from '../../../../core/models/widget-query';
import { toCsv } from '../csv.util';
import { resolveWidgetFilter } from '../effective-filter';
import { WidgetDataSource } from '../widget-data-source';
import { DataWidgetBase } from '../data-widget-base';
import { WidgetCountBarComponent } from '../widget-count-bar/widget-count-bar.component';
import { WidgetStatusComponent } from '../widget-status/widget-status.component';

/** A short word for what the figure is being measured against, for the trend caption. */
function comparisonCaption(config: KpiWidgetConfig): string {
  switch (config.comparisonMode) {
    case 'fixedTarget':
      return 'target';
    case 'previousPeriod':
      return `previous ${config.periodDays} day${config.periodDays === 1 ? '' : 's'}`;
    default:
      return '';
  }
}

/**
 * One headline number reduced from a dataset: a plain aggregate, or the count/percent of rows
 * failing a tolerance band, with an optional trend against a fixed target or the previous period.
 */
@Component({
  selector: 'app-kpi-widget',
  imports: [WidgetCountBarComponent, WidgetStatusComponent],
  templateUrl: './kpi-widget.component.html',
  styleUrl: './kpi-widget.component.scss',
})
export class KpiWidgetComponent extends DataWidgetBase {
  public readonly config = input.required<KpiWidgetConfig>();
  /** Bumped by the page when column configuration changes, to refetch the schema. */
  public readonly datasetVersion = input(0);
  /** The report-level filter for this widget's dataset, layered over its own. */
  public readonly reportFilter = input<FilterGroup | null>(null);
  /** The widget's own filter, supplied by the host so half-typed conditions can be dropped. */
  public readonly widgetFilter = input<FilterGroup | null | undefined>(undefined);

  public readonly datasetId = computed(() => this.config().datasetId);

  /** True once a dataset is bound and the value is fully specified for its source. */
  public readonly configured = computed(() => {
    const config = this.config();
    if (!config.datasetId) return false;
    if (config.valueSource === 'aggregate') {
      return config.aggregate === 'count' || !!config.valueColumnId;
    }
    return !!config.valueColumnId && !!config.tolerance;
  });

  public readonly displayValue = computed(() => this.source.result()?.displayValue ?? '—');

  public readonly trend = computed(() => this.source.result()?.trend ?? 'unknown');
  public readonly sentiment = computed(() => this.source.result()?.sentiment ?? 'neutral');

  /** "vs target (100.0)" / "vs previous 7 days (84.2) (+20%)" — null without a comparison. */
  public readonly comparisonLabel = computed(() => {
    const result = this.source.result();
    if (!result || result.comparisonDisplayValue === null) return null;
    const caption = comparisonCaption(this.config());
    const pct = result.deltaPercent;
    const pctText = pct !== null ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(0)}%)` : '';
    return `vs ${caption} — ${result.comparisonDisplayValue}${pctText}`;
  });

  public readonly isTruncated = computed(() => !!this.source.result()?.truncated);

  /** What is narrowing the rows, for the count bar's hover text. */
  public readonly filterLines = computed(() =>
    this.describeFilters([this.effectiveFilter()], this.source.columns()),
  );

  /** The always-on footer text, mirroring the other data widgets' "N of M rows". */
  public readonly countLabel = computed(() => {
    const data = this.source.result();
    if (!data) return '';
    const matched = data.matchedRowCount;
    const total = data.totalRowCount;
    if (this.isTruncated()) return `Based on first ${matched.toLocaleString()} rows (more exist)`;
    const filtered = matched !== total;
    const rowsText = `${matched.toLocaleString()} row${matched === 1 ? '' : 's'}`;
    return filtered ? `${matched.toLocaleString()} of ${total.toLocaleString()} rows` : rowsText;
  });

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
      if (!config.datasetId) return null;
      if (config.valueSource === 'aggregate' && config.aggregate !== 'count' && !config.valueColumnId) {
        return null;
      }
      if (config.valueSource === 'toleranceOutOfLimits' && (!config.valueColumnId || !config.tolerance)) {
        return null;
      }

      return this.datasetApi.queryKpi(config.datasetId, {
        filter: this.effectiveFilter(),
        valueSource: config.valueSource,
        aggregate: config.aggregate,
        valueColumnId: config.valueColumnId,
        tolerance: config.tolerance,
        toleranceStatusMode: config.toleranceStatusMode,
        showAsPercent: config.showAsPercent,
        comparisonMode: config.comparisonMode,
        targetValue: config.targetValue,
        dateColumnId: config.dateColumnId,
        periodDays: config.periodDays,
        direction: config.direction,
        unit: config.unit,
        decimalPlaces: config.decimalPlaces,
      });
    },
  });

  constructor() {
    super();
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

    // Re-reduce whenever the value source, comparison, or filter change.
    effect(() => {
      if (!this.configured()) return;
      this.effectiveFilter();
      const config = this.config();
      void [
        config.valueSource,
        config.aggregate,
        config.valueColumnId,
        config.tolerance,
        config.toleranceStatusMode,
        config.showAsPercent,
        config.comparisonMode,
        config.targetValue,
        config.dateColumnId,
        config.periodDays,
        config.direction,
        config.unit,
        config.decimalPlaces,
      ];

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

  public exportName(): string {
    return this.config().title?.trim() || 'kpi';
  }

  /** The figure and its comparison as a one-row CSV. */
  public exportCsv(): string | null {
    const data = this.source.result();
    if (!data) return null;
    return toCsv([
      ['Value', 'Comparison'],
      [data.displayValue ?? '', data.comparisonDisplayValue ?? ''],
    ]);
  }

  /** Source-derived signals, exposed as getters so their backing field stays below the public block. */
  public get loading(): Signal<boolean> {
    return this.source.loading;
  }
  public get error(): Signal<boolean> {
    return this.source.error;
  }
}
