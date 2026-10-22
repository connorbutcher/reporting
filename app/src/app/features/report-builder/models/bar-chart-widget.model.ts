import { computed, signal } from '@angular/core';
import {
  Aggregate,
  BarChartWidget,
  BarChartWidgetConfig,
  ChartSort,
  WidgetConfigDefaults,
  DateGrouping,
} from '../../../core/models/report';
import { WidgetCatalog } from '../../../core/models/widget-catalog/widget-catalog';
import { ValidationIssue } from './validation-issue';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './sources/model-sources';

/** A bar chart: `xColumnId` is the category and the value columns are the measures. Count needs no measure. */
export class BarChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'barChart' as const;

  public readonly aggregate = signal<Aggregate>('sum');
  public readonly stacked = signal(false);
  public readonly horizontal = signal(false);
  public readonly sort = signal<ChartSort>(WidgetConfigDefaults.CHART_SORT);
  /** Buckets a date category by period; null groups by exact date. */
  public readonly categoryGrouping = signal<DateGrouping | null>(null);
  public readonly percentStacked = signal(false);
  public readonly showStackTotals = signal(false);

  /** Whether the chart can have several series (overlays, measures or a split); stacking only applies then. */
  public readonly multiSeries = computed(() => {
    const bindings = this.bindings();
    if (bindings.length > 1) {
      return true;
    }
    return bindings.some((b) => !!b.seriesColumnId() || b.barValueColumnIds().length > 1);
  });

  constructor(widget: BarChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.aggregate.set(widget.config.aggregate);
    this.stacked.set(widget.config.stacked);
    this.horizontal.set(widget.config.horizontal);
    // Older charts default to natural order.
    this.sort.set(widget.config.sort ?? WidgetConfigDefaults.CHART_SORT);
    this.categoryGrouping.set(widget.config.categoryGrouping ?? null);
    this.percentStacked.set(widget.config.percentStacked ?? false);
    this.showStackTotals.set(widget.config.showStackTotals ?? false);
  }

  public needsValue(): boolean {
    return this.aggregate() !== 'count';
  }

  public override toDto(): BarChartWidget {
    const config: BarChartWidgetConfig = {
      type: 'barChart',
      ...WidgetConfigDefaults.BAR_CHART,
      ...this.chartConfigBaseDto(),
      aggregate: this.aggregate(),
      stacked: this.stacked(),
      horizontal: this.horizontal(),
      sort: this.sort(),
      categoryGrouping: this.categoryGrouping(),
      percentStacked: this.percentStacked(),
      showStackTotals: this.showStackTotals(),
    };
    return { ...this.geometryDto(), type: 'barChart', config };
  }

  public override defaultTitle(): string {
    return WidgetCatalog.descriptor('barChart').label;
  }

  // Every binding is checked, so a half-configured overlay (which the query skips) still warns.
  public override ownIssues(): ValidationIssue[] {
    const name = this.label();
    const bindings = this.bindings();
    const multi = bindings.length > 1;
    const issues: ValidationIssue[] = [...this.sharedChartIssues()];

    bindings.forEach((binding, i) => {
      const where = multi ? `${name} (series ${i + 1})` : name;
      if (!binding.datasetId()) {
        issues.push(
          this.issue(
            `noDataset:${binding.id}`,
            'warning',
            `${where} has no dataset`,
            'Pick a dataset so the chart has something to plot.',
          ),
        );
      } else if (!binding.xColumnId()) {
        issues.push(
          this.issue(
            `noCategory:${binding.id}`,
            'warning',
            `${where} has no category`,
            'Pick a category column to group the bars by.',
          ),
        );
      } else if (this.needsValue() && binding.barValueColumnIds().length === 0) {
        issues.push(
          this.issue(
            `noValue:${binding.id}`,
            'warning',
            `${where} has no value`,
            `Pick a value column for the ${this.aggregate()} to summarise.`,
          ),
        );
      }
    });

    return issues;
  }
}
