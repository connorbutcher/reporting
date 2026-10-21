import {
  ComponentRef,
  DestroyRef,
  Directive,
  OutputRef,
  OutputRefSubscription,
  effect,
  inject,
  input,
  reflectComponentType,
  untracked,
  ViewContainerRef,
} from '@angular/core';
import { FilterGroup } from '../../../core/models/filter';
import { Widget, WidgetType } from '../../../core/models/report';
import { WidgetComponentRegistry } from './widget-component.registry';
import { WidgetExportBase } from './widget-export-base';
import { WidgetOutputHandler } from './widget-output-handler';

/**
 * Renders a widget by creating the component the registry maps its type to. Inputs and outputs
 * are wired only where the component declares them, so a new widget kind needs only a
 * {@link WIDGET_COMPONENTS} entry. A data widget is `filterable` when the host handles its
 * `filterRequest`.
 */
@Directive({
  selector: '[appWidgetOutlet]',
  exportAs: 'widgetOutlet',
})
export class WidgetOutletDirective {
  public readonly widget = input.required<Widget>({ alias: 'appWidgetOutlet' });

  /** The report-level filter for this widget's dataset, layered over its own (table only). */
  public readonly reportFilter = input<FilterGroup | null>(null);
  /** This widget's own filter (table only). */
  public readonly widgetFilter = input<FilterGroup | null>(null);
  /** A chart's per-binding resolved filters, keyed by binding id (chart only). */
  public readonly bindingFilters = input<Record<string, FilterGroup | null> | null>(null);
  /** Bumped when column configuration changes, so the widget refetches (builder only). */
  public readonly datasetVersion = input(0);
  /** Handlers for the widget's outputs, keyed by output name (builder edits only). */
  public readonly widgetOutputs = input<Record<string, WidgetOutputHandler>>({});

  private readonly viewContainer = inject(ViewContainerRef);
  private ref: ComponentRef<unknown> | null = null;
  private renderedType: WidgetType | null = null;
  private declaredInputs = new Set<string>();
  private outputSubscriptions: OutputRefSubscription[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearOutputSubscriptions());

    effect(() => {
      const widget = this.widget();
      this.ensureComponent(widget.type);

      this.ref!.setInput('config', widget.config);
      this.setOptionalInput('widgetId', widget.id);
      this.setOptionalInput('reportFilter', this.reportFilter());
      this.setOptionalInput('widgetFilter', this.widgetFilter());
      this.setOptionalInput('bindingFilters', this.bindingFilters());
      this.setOptionalInput('datasetVersion', this.datasetVersion());
      this.setOptionalInput('filterable', 'filterRequest' in this.widgetOutputs());
    });
  }

  public exporter(): WidgetExportBase | null {
    const instance = this.ref?.instance;
    return instance instanceof WidgetExportBase ? instance : null;
  }

  private ensureComponent(type: WidgetType): void {
    if (this.ref && this.renderedType === type) return;

    this.clearOutputSubscriptions();
    this.ref?.destroy();

    const component = WidgetComponentRegistry.COMPONENTS[type];
    this.ref = this.viewContainer.createComponent(component);

    const mirror = reflectComponentType(component);
    this.declaredInputs = new Set(mirror?.inputs.map((i) => i.templateName) ?? []);
    this.renderedType = type;

    // Handlers are stable per host, so outputs are wired once per component.
    const handlers = untracked(this.widgetOutputs);
    const instance = this.ref.instance as Record<string, OutputRef<unknown>>;
    for (const output of mirror?.outputs ?? []) {
      const handler = handlers[output.templateName];
      if (!handler) continue;
      this.outputSubscriptions.push(
        instance[output.propName].subscribe((value) => handler(value as never)),
      );
    }
  }

  private setOptionalInput(name: string, value: unknown): void {
    if (this.declaredInputs.has(name)) this.ref!.setInput(name, value);
  }

  private clearOutputSubscriptions(): void {
    for (const subscription of this.outputSubscriptions) subscription.unsubscribe();
    this.outputSubscriptions = [];
  }
}
