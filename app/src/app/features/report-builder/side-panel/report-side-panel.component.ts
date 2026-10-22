import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { PanelNavigation } from '../state/panel-navigation';
import { ReportSession } from '../state/report-session';
import { PanelComponentRegistry } from './panel-component.registry';
import { Crumb } from './crumb';
import { PanelView } from './panel-view';

/** The side panel chrome: history controls, breadcrumb and the current view. */
@Component({
  selector: 'app-report-side-panel',
  imports: [NgComponentOutlet, ButtonModule, DividerModule],
  templateUrl: './report-side-panel.component.html',
  styleUrl: './report-side-panel.component.scss',
})
export class ReportSidePanelComponent {
  private static readonly ELLIPSIS = 'ellipsis' as const;

  /** Above this many ancestors, the middle of the trail collapses behind "…". */
  private static readonly COLLAPSE_THRESHOLD = 4;

  public readonly ellipsis = ReportSidePanelComponent.ELLIPSIS;

  public readonly currentPanel = computed(() =>
    PanelComponentRegistry.componentFor(this.navigation.view()),
  );

  /** Root first, excluding the current view. */
  public readonly ancestors = computed(() => {
    const chain: PanelView[] = [];
    let parent = PanelComponentRegistry.parentOf(this.navigation.view());
    while (parent) {
      chain.unshift(parent);
      parent = PanelComponentRegistry.parentOf(parent);
    }
    return chain;
  });

  /** The full trail when short or expanded, else root, "…" and the two nearest steps. */
  public readonly crumbs = computed<Crumb[]>(() => {
    const all = this.ancestors();
    if (all.length <= ReportSidePanelComponent.COLLAPSE_THRESHOLD || this.expanded()) {
      return all;
    }
    return [all[0], ReportSidePanelComponent.ELLIPSIS, ...all.slice(-2)];
  });

  public readonly title = computed(() => this.labelFor(this.navigation.view()));

  private readonly navigation = inject(PanelNavigation);
  private readonly session = inject(ReportSession);

  /** The user expanded the collapsed trail for this screen. */
  private readonly expanded = signal(false);

  constructor() {
    // Each new screen starts collapsed.
    effect(() => {
      this.navigation.view();
      this.expanded.set(false);
    });
  }

  /** A collision-free `@for` key, built field by field since `Object.values` order isn't guaranteed. */
  private static viewKey(view: PanelView): string {
    const parts: string[] = [view.kind];
    if ('widgetId' in view) {
      parts.push(view.widgetId);
    }
    if ('columnId' in view) {
      parts.push(view.columnId);
    }
    if ('bandId' in view) {
      parts.push(view.bandId);
    }
    return parts.join('/');
  }

  public crumbKey(crumb: Crumb): string {
    return crumb === ReportSidePanelComponent.ELLIPSIS
      ? ReportSidePanelComponent.ELLIPSIS
      : ReportSidePanelComponent.viewKey(crumb);
  }

  public expand(): void {
    this.expanded.set(true);
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  public back(): void {
    this.navigation.back();
  }

  public forward(): void {
    this.navigation.forward();
  }

  /** A panel's `static title`, refined with the live widget or column name for the two data-driven screens. */
  public labelFor(view: PanelView): string {
    const fallback = PanelComponentRegistry.VIEWS[view.kind].component.title;
    switch (view.kind) {
      case 'columnSettings':
        return this.session.selectedTableWidget()?.column(view.columnId)?.label() ?? fallback;
      case 'widget':
        return this.session.selectedWidget()?.label() ?? fallback;
      default:
        return fallback;
    }
  }

  public get canGoBack() {
    return this.navigation.canGoBack;
  }

  public get canGoForward() {
    return this.navigation.canGoForward;
  }
}
