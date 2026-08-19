import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ReportBuilderStore } from '../report-builder.store';
import { PANEL_COMPONENTS } from './panel-component.registry';
import { PanelView } from './panel-view';

/**
 * Where a view sits in the panel's logical hierarchy — independent of how the
 * user actually got there. Chronological history (back/forward) can jump
 * sideways between unrelated widgets; this is what the breadcrumb walks
 * instead, so it always reflects "what's this screen part of", not "what did
 * I look at right before this".
 */
function parentOf(view: PanelView): PanelView | null {
  switch (view.kind) {
    case 'root':
      return null;
    case 'report':
    case 'widgets':
    case 'reportFilters':
    case 'addWidget':
    case 'issues':
      return { kind: 'root' };
    case 'widget':
      return { kind: 'widgets' };
    case 'widgetColumns':
    case 'tableAppearance':
    case 'textStyle':
    case 'widgetFilters':
    case 'chartToleranceBand':
      return { kind: 'widget', widgetId: view.widgetId };
    case 'addColumn':
    case 'columnSettings':
      return { kind: 'widgetColumns', widgetId: view.widgetId };
    case 'columnTolerance':
      return { kind: 'columnSettings', widgetId: view.widgetId, columnId: view.columnId };
  }
}

/** A stable string for `@for` tracking — cheaper than JSON.stringify per view. */
function viewKey(view: PanelView): string {
  return Object.values(view).join(':');
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
  protected readonly currentPanel = computed(() => PANEL_COMPONENTS[this.store.view().kind]);

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

  protected labelFor(view: PanelView): string {
    switch (view.kind) {
      case 'root':
        return 'Report builder';
      case 'report':
        return 'Report settings';
      case 'widgets':
        return 'Widgets';
      case 'addWidget':
        return 'Add widget';
      case 'widgetColumns':
        return 'Columns';
      case 'addColumn':
        return 'Add column';
      case 'tableAppearance':
        return 'Appearance';
      case 'textStyle':
        return 'Style';
      case 'widgetFilters':
        return 'Filters';
      case 'reportFilters':
        return 'Report filters';
      case 'issues':
        return 'Report issues';
      case 'columnSettings':
        return this.store.selectedTableWidget()?.column(view.columnId)?.label() ?? 'Column';
      case 'columnTolerance':
        return 'Tolerance limits';
      case 'chartToleranceBand':
        return 'Tolerance band';
      case 'widget':
        return this.store.selectedWidget()?.label() ?? 'Widget';
    }
  }
}
