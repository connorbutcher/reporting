import { signal } from '@angular/core';
import {
  DEFAULT_HISTOGRAM_CONFIG,
  HistogramBinMode,
  HistogramNormalize,
  HistogramWidget,
  HistogramWidgetConfig,
} from '../../../core/models/report';
import { widgetTypeDescriptor } from '../../../core/models/widget-catalog';
import { ValidationIssue } from './validation-issue';
import { ChartWidgetModel } from './chart-widget.model';
import { ModelSources } from './widget-model-base';

/**
 * A histogram. It reuses the shared chart base for dataset/series/filter binding, reading
 * `xColumnId` as the single numeric column whose values are binned — there is no separate measure,
 * unlike the bar and box charts, so only the value column is required.
 */
export class HistogramWidgetModel extends ChartWidgetModel {
  public override readonly type = 'histogram' as const;

  /** How the bin edges are chosen. */
  public readonly binMode = signal<HistogramBinMode>('auto');
  /** The number of bins for `count` mode; ignored otherwise. */
  public readonly binCount = signal(10);
  /** The width of each bin for `width` mode; ignored otherwise. */
  public readonly binWidth = signal(1);
  /** Fixed lower bound of the binned range; null uses the data's minimum. */
  public readonly rangeMin = signal<number | null>(null);
  /** Fixed upper bound of the binned range; null uses the data's maximum. */
  public readonly rangeMax = signal<number | null>(null);
  /** Whether each bar shows a raw count, a relative frequency, or a density. */
  public readonly normalize = signal<HistogramNormalize>('count');
  /** Accumulates each bin into the ones before it, drawing a cumulative distribution. */
  public readonly cumulative = signal(false);
  /** Draws bars horizontally (bins down the Y axis) rather than as vertical columns. */
  public readonly horizontal = signal(false);

  constructor(widget: HistogramWidget, sources: ModelSources) {
    super(widget, sources);
    this.binMode.set(widget.config.binMode ?? 'auto');
    this.binCount.set(widget.config.binCount ?? 10);
    this.binWidth.set(widget.config.binWidth ?? 1);
    this.rangeMin.set(widget.config.rangeMin ?? null);
    this.rangeMax.set(widget.config.rangeMax ?? null);
    this.normalize.set(widget.config.normalize ?? 'count');
    this.cumulative.set(widget.config.cumulative ?? false);
    this.horizontal.set(widget.config.horizontal ?? false);
  }

  public override toDto(): HistogramWidget {
    const config: HistogramWidgetConfig = {
      type: 'histogram',
      ...DEFAULT_HISTOGRAM_CONFIG,
      ...this.chartConfigBaseDto(),
      binMode: this.binMode(),
      binCount: this.binCount(),
      binWidth: this.binWidth(),
      rangeMin: this.rangeMin(),
      rangeMax: this.rangeMax(),
      normalize: this.normalize(),
      cumulative: this.cumulative(),
      horizontal: this.horizontal(),
    };
    return { ...this.geometryDto(), type: 'histogram', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('histogram').label;
  }

  // The binned column maps to xColumnId; there is no measure, so only a dataset and that column
  // are required. A worded message matches the box/bar checks' one-prompt-at-a-time style.
  public override ownIssues(): ValidationIssue[] {
    const name = this.label();

    if (!this.datasetId()) {
      return [
        {
          id: `${this.id}:noDataset`,
          severity: 'warning',
          title: `${name} has no dataset`,
          detail: 'Pick a dataset so the chart has something to plot.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    if (!this.xColumnId()) {
      return [
        {
          id: `${this.id}:noValue`,
          severity: 'warning',
          title: `${name} has no value`,
          detail: 'Pick a numeric column whose distribution the histogram bins.',
          widgetId: this.id,
          view: { kind: 'widget', widgetId: this.id },
        },
      ];
    }

    return [];
  }
}
