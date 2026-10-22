import { Injectable, computed, inject, signal } from '@angular/core';
import { widgetFragment } from '../../../core/models/report';
import { UrlFragmentService } from '../../../core/services/url-fragment.service';
import { ValidationIssue } from '../models/validation-issue';
import { PanelView } from '../side-panel/panel-view';
import { ReportSession } from './report-session';
import { WidgetSelection } from './widget-selection';

/**
 * The side panel's back/forward history (separate from the edit undo stack), kept in step with the
 * canvas selection: navigating to a widget selects it, selecting one navigates to it, and its tab is
 * brought to the front.
 */
@Injectable()
export class PanelNavigation {
  public readonly view = computed(() => this.history()[this.index()]);
  public readonly canGoBack = computed(() => this.index() > 0);
  public readonly canGoForward = computed(() => this.index() < this.history().length - 1);

  private readonly selection = inject(WidgetSelection);
  private readonly session = inject(ReportSession);
  private readonly fragments = inject(UrlFragmentService);
  private readonly history = signal<PanelView[]>([{ kind: 'root' }]);
  private readonly index = signal(0);

  public navigate(view: PanelView): void {
    // Navigating from a point in history discards anything after it.
    const trimmed = this.history().slice(0, this.index() + 1);
    this.history.set([...trimmed, view]);
    this.index.set(trimmed.length);
    this.syncSelectionToView();
  }

  /** Steps sideways without adding history. */
  public replace(view: PanelView): void {
    this.history.update((views) => views.map((v, i) => (i === this.index() ? view : v)));
    this.syncSelectionToView();
  }

  public back(): void {
    if (!this.canGoBack()) {
      return;
    }
    this.index.update((i) => i - 1);
    this.syncSelectionToView();
  }

  public forward(): void {
    if (!this.canGoForward()) {
      return;
    }
    this.index.update((i) => i + 1);
    this.syncSelectionToView();
  }

  public selectWidget(widgetId: string): void {
    const current = this.view();
    const alreadyThere =
      current.kind === 'widget' &&
      current.widgetId === widgetId &&
      this.selection.selectedWidgetIds().length === 1;

    this.focusTabFor(widgetId);
    this.selection.select(widgetId);
    if (!alreadyThere) {
      this.navigate({ kind: 'widget', widgetId });
    }
  }

  /** For ctrl/shift-click on the canvas. */
  public toggleWidgetSelection(widgetId: string): void {
    this.selection.toggle(widgetId);
    const primary = this.selection.selectedWidgetIds().at(-1);
    if (primary) {
      this.navigate({ kind: 'widget', widgetId: primary });
    }
  }

  /**
   * Opens whatever the issue is about. For a widget, the tab switch and URL fragment change land in
   * one navigation, which scrolls the canvas to it and makes the link shareable.
   */
  public goToIssue(issue: ValidationIssue): void {
    if (issue.widgetId) {
      this.selection.set([issue.widgetId]);
      const tabId = this.session.model()?.tabOf(issue.widgetId)?.id;
      this.fragments.navigate(widgetFragment(issue.widgetId), tabId ? { tab: tabId } : undefined);
    }
    this.navigate(issue.view);
  }

  private focusTabFor(widgetId: string): void {
    const tab = this.session.model()?.tabOf(widgetId);
    if (tab && this.session.activeTabId() !== tab.id) {
      this.session.goToTab(tab.id);
    }
  }

  private syncSelectionToView(): void {
    const view = this.view();
    // The panel focuses one widget; a canvas multi-selection is replaced only when it moves elsewhere.
    if ('widgetId' in view && !this.selection.selectedWidgetIds().includes(view.widgetId)) {
      this.selection.select(view.widgetId);
    }
  }
}
