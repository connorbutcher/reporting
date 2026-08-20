import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ReportBuilderStore } from '../report-builder.store';
import { PANEL_VIEWS, panelComponentFor, parentOf } from './panel-component.registry';
import { PanelView } from './panel-view';

/**
 * A stable, collision-free key for `@for` tracking. Built field by field — not
 * from `Object.values`, whose ordering isn't guaranteed — and prefixed by kind,
 * so two different views can never collapse to the same key.
 */
function viewKey(view: PanelView): string {
  const parts: string[] = [view.kind];
  if ('widgetId' in view) parts.push(view.widgetId);
  if ('columnId' in view) parts.push(view.columnId);
  if ('bandId' in view) parts.push(view.bandId);
  return parts.join('/');
}

/** Stands in for the ancestors hidden between the first and last couple of crumbs. */
const ELLIPSIS = 'ellipsis' as const;
type Crumb = PanelView | typeof ELLIPSIS;

/** Above this many ancestors, the middle of the trail collapses behind "…". */
const COLLAPSE_THRESHOLD = 4;

/** Chrome for the side panel: history controls, breadcrumb, and the current view. */
@Component({
  selector: 'app-report-side-panel',
  imports: [NgComponentOutlet, ButtonModule, DividerModule],
  templateUrl: './report-side-panel.component.html',
  styleUrl: './report-side-panel.component.scss',
})
export class ReportSidePanelComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly ellipsis = ELLIPSIS;

  /** The component to render for the current view — replaces a per-kind template switch. */
  protected readonly currentPanel = computed(() => panelComponentFor(this.store.view()));

  // Narrow pass-throughs so the template binds only to this component's own API,
  // never to the store directly.
  protected readonly canGoBack = this.store.canGoBack;
  protected readonly canGoForward = this.store.canGoForward;

  /** User asked to see the collapsed middle of the trail for the current screen. */
  private readonly expanded = signal(false);

  constructor() {
    // A fresh screen starts collapsed again — an expansion from three levels
    // ago isn't relevant once the user has navigated somewhere new.
    effect(() => {
      this.store.view();
      this.expanded.set(false);
    });
  }

  /** Every ancestor of the current view, root first, not including the current view itself. */
  protected readonly ancestors = computed(() => {
    const chain: PanelView[] = [];
    let parent = parentOf(this.store.view());
    while (parent) {
      chain.unshift(parent);
      parent = parentOf(parent);
    }
    return chain;
  });

  /**
   * What the breadcrumb actually renders: the full trail once it's short
   * enough or the user has asked to see it all, otherwise root plus the
   * couple of steps nearest the current screen, with the rest behind "…".
   */
  protected readonly crumbs = computed<Crumb[]>(() => {
    const all = this.ancestors();
    if (all.length <= COLLAPSE_THRESHOLD || this.expanded()) return all;
    return [all[0], ELLIPSIS, ...all.slice(-2)];
  });

  protected readonly title = computed(() => this.labelFor(this.store.view()));

  protected crumbKey(crumb: Crumb): string {
    return crumb === ELLIPSIS ? ELLIPSIS : viewKey(crumb);
  }

  protected expand(): void {
    this.expanded.set(true);
  }

  protected navigate(view: PanelView): void {
    this.store.navigate(view);
  }

  protected back(): void {
    this.store.back();
  }

  protected forward(): void {
    this.store.forward();
  }

  /**
   * The heading for a view. Each panel names itself through its `static title`
   * (see {@link PANEL_VIEWS}); the two data-derived screens refine that default
   * with the live widget/column name, falling back to the panel's own title
   * when there's no selection to show.
   */
  protected labelFor(view: PanelView): string {
    const fallback = PANEL_VIEWS[view.kind].component.title;
    switch (view.kind) {
      case 'columnSettings':
        return this.store.selectedTableWidget()?.column(view.columnId)?.label() ?? fallback;
      case 'widget':
        return this.store.selectedWidget()?.label() ?? fallback;
      default:
        return fallback;
    }
  }
}
