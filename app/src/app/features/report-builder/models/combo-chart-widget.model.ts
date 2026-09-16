import { computed, signal } from '@angular/core';
import {
  Aggregate,
  ComboChartWidget,
  ComboChartWidgetConfig,
  DEFAULT_COMBO_CHART_CONFIG,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ChartWidgetModel } from './chart-widget.model';
import { ValidationIssue } from './validation-issue';
import { ModelSources } from './widget-model-base';

/**
 * A combination chart. It shares the bar chart's data model — categories reduced by an aggregate,
 * one value per category per series — and queries through the very same bar endpoint; what differs
 * is only that each series (binding) draws as bars or as a line, per its {@link renderAs}. Series
 * can also sit on separate value axes, so bars and an overlaid line each read on their own scale.
 */
export class ComboChartWidgetModel extends ChartWidgetModel {
  public override readonly type = 'comboChart' as const;

  public readonly aggregate = signal<Aggregate>('sum');
  /** Stacks each binding's *bar* series into one column; line series are never stacked. */
  public readonly stacked = signal(false);
  /** Draws line series with curved rather than straight segments. */
  public readonly smooth = signal(false);
  /** Whether point markers are drawn along line series. */
  public readonly showPoints = signal(true);
  /** Shades the area under line series. */
  public readonly areaFill = signal(false);

  /**
   * Whether the chart can produce more than one bar series to stack — from several overlaid
   * datasets, a binding's multiple measures, or a colour-by split. The "Stack bars" toggle keys
   * off it, matching the bar chart.
   */
  public readonly multiSeries = computed(() => {
    const bindings = this.bindings();
    if (bindings.length > 1) return true;
    return bindings.some((b) => !!b.seriesColumnId() || b.barValueColumnIds().length > 1);
  });

  /** Whether any series is drawn as a line — gates the line-only appearance options. */
  public readonly hasLineSeries = computed(() => this.bindings().some((b) => b.renderAs() === 'line'));

  constructor(widget: ComboChartWidget, sources: ModelSources) {
    super(widget, sources);
    this.aggregate.set(widget.config.aggregate);
    this.stacked.set(widget.config.stacked);
    this.smooth.set(widget.config.smooth);
    this.showPoints.set(widget.config.showPoints);
    this.areaFill.set(widget.config.areaFill);
  }

  /** Count summarises row counts, so it needs no measure column — matching the bar chart. */
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
    };
    return { ...this.geometryDto(), type: 'comboChart', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('comboChart').label;
  }

  // Category maps to xColumnId, measures to the binding's value columns (optional for Count) —
  // the bar chart's rules. Each series is validated so a half-configured overlaid dataset, which
  // the bar query would silently skip, still raises a warning, one per series.
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
