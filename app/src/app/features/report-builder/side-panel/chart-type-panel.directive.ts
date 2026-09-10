import { ComponentRef, Directive, Type, ViewContainerRef, effect, inject, input } from '@angular/core';
import { WidgetType } from '../../../core/models/report';
import { ChartWidgetModel } from '../models/widget.model';

/**
 * A chart's type mapped to the panel component that edits one facet of it (its data
 * source, its appearance, …). Partial because only the chart types are ever keys — a
 * chart's `.type` is always one of them, so a miss means the map is simply incomplete.
 */
export type ChartTypePanels = Partial<Record<WidgetType, Type<unknown>>>;

/**
 * Renders the panel for a chart's *type* by creating it imperatively, so a chart-detail
 * screen composes fixed sub-panels around a single swap-point rather than branching on
 * the chart kind with a stack of `@if`s. Sits on an `<ng-container>` anchor and builds
 * the mapped component into it with {@link ViewContainerRef.createComponent}, binding the
 * chart to the child's `chart` input. Only rebuilds when the *type* changes; a new model
 * of the same type flows straight through, so per-type editor state survives selection
 * changes between like charts.
 */
@Directive({
  selector: '[appChartTypePanel]',
})
export class ChartTypePanelDirective {
  /** The chart whose type selects the panel, and which the created panel is bound to. */
  public readonly appChartTypePanel = input.required<ChartWidgetModel>();

  /** The type → component map the panel is created from. */
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
