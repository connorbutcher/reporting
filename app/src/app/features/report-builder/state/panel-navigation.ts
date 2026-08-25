import { Injectable, computed, inject, signal } from '@angular/core';
import { ValidationIssue } from '../models/validation-issue';
import { PanelView } from '../side-panel/panel-view';
import { ReportSession } from './report-session';
import { WidgetSelection } from './widget-selection';

/**
 * Where the side panel has been — a linear back/forward history, separate from
 * the report's own undo stack (which tracks edits, not navigation) — together
 * with the coordination that keeps the canvas selection in step with it.
 *
 * Navigating the panel to a widget selects it, and selecting a widget navigates
 * the panel to it, so the two never drift apart; the tab that owns a selected
 * widget is brought to the front so the canvas shows what's configured.
 */
@Injectable()
export class PanelNavigation {
  private readonly selection = inject(WidgetSelection);
  private readonly session = inject(ReportSession);

  private readonly history = signal<PanelView[]>([{ kind: 'root' }]);
  private readonly index = signal(0);

  readonly view = computed(() => this.history()[this.index()]);
  readonly canGoBack = computed(() => this.index() > 0);
  readonly canGoForward = computed(() => this.index() < this.history().length - 1);

  navigate(view: PanelView): void {
    // Navigating from a point in history discards anything after it.
    const trimmed = this.history().slice(0, this.index() + 1);
    this.history.set([...trimmed, view]);
    this.index.set(trimmed.length);
    this.syncSelectionToView();
  }

  /** Replaces the current entry, for stepping sideways without adding history. */
  replace(view: PanelView): void {
    this.history.update((views) => views.map((v, i) => (i === this.index() ? view : v)));
    this.syncSelectionToView();
  }

  back(): void {
    if (!this.canGoBack()) return;
    this.index.update((i) => i - 1);
    this.syncSelectionToView();
  }

  forward(): void {
    if (!this.canGoForward()) return;
    this.index.update((i) => i + 1);
    this.syncSelectionToView();
  }

  /** Selecting a widget anywhere opens its configuration in the panel. */
  selectWidget(widgetId: string): void {
    const current = this.view();
    const alreadyThere =
      current.kind === 'widget' &&
      current.widgetId === widgetId &&
      this.selection.selectedWidgetIds().length === 1;

    this.focusTabFor(widgetId);
    this.selection.select(widgetId);
    if (!alreadyThere) this.navigate({ kind: 'widget', widgetId });
  }

  /** Adds to or removes from the selection, for ctrl/shift-clicking on the canvas. */
  toggleWidgetSelection(widgetId: string): void {
    this.selection.toggle(widgetId);
    const primary = this.selection.selectedWidgetIds().at(-1);
    if (primary) this.navigate({ kind: 'widget', widgetId: primary });
  }

  /** Takes the user to whatever the issue is about. */
  goToIssue(issue: ValidationIssue): void {
    if (issue.widgetId) {
      this.focusTabFor(issue.widgetId);
      this.selection.set([issue.widgetId]);
    }
    this.navigate(issue.view);
  }

  /** Brings the tab that owns a widget to the front, so the canvas shows what's selected. */
  private focusTabFor(widgetId: string): void {
    const tab = this.session.model()?.tabOf(widgetId);
    if (tab && this.session.activeTabId() !== tab.id) this.session.goToTab(tab.id);
  }

  private syncSelectionToView(): void {
    const view = this.view();
    // Panel navigation always focuses a single widget; canvas multi-selection
    // is only replaced when the panel actually moves to a different one.
    if ('widgetId' in view && !this.selection.selectedWidgetIds().includes(view.widgetId)) {
      this.selection.select(view.widgetId);
    }
  }
}
