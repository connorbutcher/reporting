import { computed, signal } from '@angular/core';
import {
  Aggregate,
  ChartSort,
  ComboChartWidget,
  ComboChartWidgetConfig,
  DEFAULT_CHART_SORT,
  DEFAULT_COMBO_CHART_CONFIG,
  DateGrouping,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ChartWidgetModel } from './chart-widget.model';
import { ValidationIssue } from './validation-issue';
import { ModelSources } from './sources/model-sources';

/**
 * A combination chart: the bar chart's data model and query, but each binding draws as bars or a
 * line ({@link renderAs}) and can sit on its own value axis.
 */
export class ComboChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'comboChart' as const;

  public readonly aggregate = signal<Aggregate>('sum');
  /** Stacks bar series per binding; lines never stack. */
  public readonly stacked = signal(false);
  public readonly smooth = signal(false);
  public readonly showPoints = signal(true);
  public readonly areaFill = signal(false);
  public readonly sort = signal<ChartSort>(DEFAULT_CHART_SORT);
  /** Buckets a date category by period; null groups by exact date. */
  public readonly categoryGrouping = signal<DateGrouping | null>(null);
  /** Draws lines straight across categories with no value. */
  public readonly connectNulls = signal(false);

  /** Whether there can be several bar series to stack, as on the bar chart. */
  public readonly multiSeries = computed(() => {
    const bindings = this.bindings();
    if (bindings.length > 1) return true;
    return bindings.some((b) => !!b.seriesColumnId() || b.barValueColumnIds().length > 1);
  });

  /** Gates the line-only appearance options. */
  public readonly hasLineSeries = computed(() =>
    this.bindings().some((b) => b.renderAs() === 'line'),
  );

  constructor(widget: ComboChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.aggregate.set(widget.config.aggregate);
    this.stacked.set(widget.config.stacked);
    this.smooth.set(widget.config.smooth);
    this.showPoints.set(widget.config.showPoints);
    this.areaFill.set(widget.config.areaFill);
    // Older charts default to natural order.
    this.sort.set(widget.config.sort ?? DEFAULT_CHART_SORT);
    this.categoryGrouping.set(widget.config.categoryGrouping ?? null);
    this.connectNulls.set(widget.config.connectNulls ?? false);
  }

  public needsValue(): boolean {
    return this.aggregate() !== 'count';
  }

  public override toDto(): ComboChartWidget {
    const config: ComboChartWidgetConfig = {
      type: 'comboChart',
      ...DEFAULT_COMBO_CHART_CONFIG,
      ...this.chartConfigBaseDto(),
      aggregate: this.aggregate(),
      stacked: this.stacked(),
      smooth: this.smooth(),
      showPoints: this.showPoints(),
      areaFill: this.areaFill(),
      sort: this.sort(),
      categoryGrouping: this.categoryGrouping(),
      connectNulls: this.connectNulls(),
    };
    return { ...this.geometryDto(), type: 'comboChart', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('comboChart').label;
  }

  // The bar chart's rules, checked per binding so a half-configured overlay still warns.
  public override ownIssues(): ValidationIssue[] {
    const name = this.label();
    const bindings = this.bindings();
    const multi = bindings.length > 1;
    const view = { kind: 'widget', widgetId: this.id } as const;
    const issues: ValidationIssue[] = [...this.sharedChartIssues()];

    bindings.forEach((binding, i) => {
      const where = multi ? `${name} (series ${i + 1})` : name;
      if (!binding.datasetId()) {
        issues.push({
          id: `${this.id}:noDataset:${binding.id}`,
          severity: 'warning',
          title: `${where} has no dataset`,
          detail: 'Pick a dataset so the chart has something to plot.',
          widgetId: this.id,
          view,
        });
      } else if (!binding.xColumnId()) {
        issues.push({
          id: `${this.id}:noCategory:${binding.id}`,
          severity: 'warning',
          title: `${where} has no category`,
          detail: 'Pick a category column to group by.',
          widgetId: this.id,
          view,
        });
      } else if (this.needsValue() && binding.barValueColumnIds().length === 0) {
        issues.push({
          id: `${this.id}:noValue:${binding.id}`,
          severity: 'warning',
          title: `${where} has no value`,
          detail: `Pick a value column for the ${this.aggregate()} to summarise.`,
          widgetId: this.id,
          view,
        });
      }
    });

    return issues;
  }
}
