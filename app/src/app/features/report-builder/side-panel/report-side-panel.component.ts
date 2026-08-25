import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { PanelNavigation } from '../state/panel-navigation';
import { ReportSession } from '../state/report-session';
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
  private readonly navigation = inject(PanelNavigation);
  private readonly session = inject(ReportSession);

  protected readonly ellipsis = ELLIPSIS;

  /** The component to render for the current view — replaces a per-kind template switch. */
  protected readonly currentPanel = computed(() => panelComponentFor(this.navigation.view()));

  // Narrow pass-throughs so the template binds only to this component's own API,
  // never to the navigation service directly.
  protected readonly canGoBack = this.navigation.canGoBack;
  protected readonly canGoForward = this.navigation.canGoForward;

  /** User asked to see the collapsed middle of the trail for the current screen. */
  private readonly expanded = signal(false);

  constructor() {
    // A fresh screen starts collapsed again — an expansion from three levels
    // ago isn't relevant once the user has navigated somewhere new.
    effect(() => {
      this.navigation.view();
      this.expanded.set(false);
    });
  }

  /** Every ancestor of the current view, root first, not including the current view itself. */
  protected readonly ancestors = computed(() => {
    const chain: PanelView[] = [];
    let parent = parentOf(this.navigation.view());
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

  protected readonly title = computed(() => this.labelFor(this.navigation.view()));

  protected crumbKey(crumb: Crumb): string {
    return crumb === ELLIPSIS ? ELLIPSIS : viewKey(crumb);
  }

  protected expand(): void {
    this.expanded.set(true);
  }

  protected navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  protected back(): void {
    this.navigation.back();
  }

  protected forward(): void {
    this.navigation.forward();
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
        return this.session.selectedTableWidget()?.column(view.columnId)?.label() ?? fallback;
      case 'widget':
        return this.session.selectedWidget()?.label() ?? fallback;
      default:
        return fallback;
    }
  }
}
