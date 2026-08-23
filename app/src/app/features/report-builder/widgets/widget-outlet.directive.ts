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
import { WIDGET_COMPONENTS } from './widget-component.registry';

/**
 * A handler for one of a widget's outputs. Its parameter is `never` so a host can
 * register handlers typed with each output's own concrete value — a function of a
 * specific type is assignable to `(value: never) => void` — while the outlet, which
 * only sees the output generically, passes the emitted value straight through.
 */
export type WidgetOutputHandler = (value: never) => void;

/**
 * Renders a widget by creating the component the registry maps its type to, rather
 * than a per-type `@if` chain in every template. Put it on an `<ng-container>`; the
 * created component is inserted at that anchor.
 *
 * Everything is wired from the component's own metadata, so a new widget kind needs
 * no changes here — only a {@link WIDGET_COMPONENTS} entry:
 *  - `config` is always set; `reportFilter`/`widgetFilter`/`datasetVersion` are set
 *    only on components that declare them (static text, say, has none of them).
 *  - each entry in {@link widgetOutputs} is subscribed only if the component actually
 *    declares that output (only a table emits `sortChange`/`columnResize`).
 */
@Directive({
  selector: '[appWidgetOutlet]',
})
export class WidgetOutletDirective {
  /** The widget to render; its `type` selects the component, its `config` seeds it. */
  readonly widget = input.required<Widget>({ alias: 'appWidgetOutlet' });

  /** The report-level filter for this widget's dataset, layered over its own (table only). */
  readonly reportFilter = input<FilterGroup | null>(null);
  /** This widget's own filter (table only). */
  readonly widgetFilter = input<FilterGroup | null>(null);
  /** A chart's per-binding resolved filters, keyed by binding id (chart only). */
  readonly bindingFilters = input<Record<string, FilterGroup | null> | null>(null);
  /** Bumped when column configuration changes, so the widget refetches (builder only). */
  readonly datasetVersion = input(0);
  /** Handlers for the widget's outputs, keyed by output name (builder edits only). */
  readonly widgetOutputs = input<Record<string, WidgetOutputHandler>>({});

  private readonly viewContainer = inject(ViewContainerRef);

  private ref: ComponentRef<unknown> | null = null;
  private renderedType: WidgetType | null = null;
  /** The created component's declared input names, so we only set ones it accepts. */
  private declaredInputs = new Set<string>();
  private outputSubscriptions: OutputRefSubscription[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearOutputSubscriptions());

    effect(() => {
      const widget = this.widget();
      this.ensureComponent(widget.type);

      this.ref!.setInput('config', widget.config);
      this.setOptionalInput('reportFilter', this.reportFilter());
      this.setOptionalInput('widgetFilter', this.widgetFilter());
      this.setOptionalInput('bindingFilters', this.bindingFilters());
      this.setOptionalInput('datasetVersion', this.datasetVersion());
    });
  }

  /** (Re)creates the component when the widget's type changes; reuses it otherwise. */
  private ensureComponent(type: WidgetType): void {
    if (this.ref && this.renderedType === type) return;

    this.clearOutputSubscriptions();
    this.ref?.destroy();

    const component = WIDGET_COMPONENTS[type];
    this.ref = this.viewContainer.createComponent(component);

    const mirror = reflectComponentType(component);
    this.declaredInputs = new Set(mirror?.inputs.map((i) => i.templateName) ?? []);
    this.renderedType = type;

    // Handlers are stable for a given host, so outputs are wired once per created
    // component rather than on every input change.
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
