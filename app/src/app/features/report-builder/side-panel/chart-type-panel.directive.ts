import { ComponentRef, Directive, ViewContainerRef, effect, inject, input } from '@angular/core';
import { WidgetType } from '../../../core/models/report';
import { ChartWidgetModel } from '../models/widget.model';
import { ChartTypePanels } from './chart-type-panels';

/**
 * Creates the panel for a chart's type, so a chart screen has one swap point instead of an `@if` per
 * kind. Rebuilds only when the type changes, so editor state survives switching between like charts.
 */
@Directive({
  selector: '[appChartTypePanel]',
})
export class ChartTypePanelDirective {
  /** Selects the panel and is bound to its `chart` input. */
  public readonly appChartTypePanel = input.required<ChartWidgetModel>();

  public readonly panels = input.required<ChartTypePanels>();

  private readonly container = inject(ViewContainerRef);
  private ref: ComponentRef<unknown> | null = null;
  private currentType: WidgetType | null = null;

  constructor() {
    effect(() => {
      const chart = this.appChartTypePanel();
      if (chart.type !== this.currentType) {
        this.container.clear();
        const component = this.panels()[chart.type] ?? null;
        this.ref = component ? this.container.createComponent(component) : null;
        this.currentType = chart.type;
      }
      this.ref?.setInput('chart', chart);
    });
  }
}
