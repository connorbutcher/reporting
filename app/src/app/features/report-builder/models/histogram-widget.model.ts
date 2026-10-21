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
import { ModelSources } from './sources/model-sources';

/** A histogram: bins the numeric `xColumnId`; there's no separate measure. */
export class HistogramWidgetModel extends ChartWidgetModel {
  public override readonly type = 'histogram' as const;

  public readonly binMode = signal<HistogramBinMode>('auto');
  /** `count` mode only. */
  public readonly binCount = signal(10);
  /** `width` mode only. */
  public readonly binWidth = signal(1);
  /** Null uses the data's minimum. */
  public readonly rangeMin = signal<number | null>(null);
  /** Null uses the data's maximum. */
  public readonly rangeMax = signal<number | null>(null);
  /** Raw count, relative frequency, or density. */
  public readonly normalize = signal<HistogramNormalize>('count');
  public readonly cumulative = signal(false);
  public readonly horizontal = signal(false);
  public readonly showNormalCurve = signal(false);

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
    this.showNormalCurve.set(widget.config.showNormalCurve ?? false);
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
      showNormalCurve: this.showNormalCurve(),
    };
    return { ...this.geometryDto(), type: 'histogram', config };
  }

  public override defaultTitle(): string {
    return widgetTypeDescriptor('histogram').label;
  }

  // Checks every binding itself, since the base check requires a yColumnId a histogram doesn't have.
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
      } else if (binding.histogramValueColumnIds().length === 0) {
        issues.push(
          this.issue(
            `noValue:${binding.id}`,
            'warning',
            `${where} has no value`,
            'Pick a numeric column whose distribution the histogram bins.',
          ),
        );
      }
    });

    return issues;
  }
}
