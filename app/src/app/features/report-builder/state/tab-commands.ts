import { Injectable, inject } from '@angular/core';
import { PanelNavigation } from './panel-navigation';
import { ReportSession } from './report-session';
import { WidgetSelection } from './widget-selection';

/**
 * Adding, removing, renaming, reordering and switching tabs. Which tab is active
 * lives in the route's `tab` query param, so switching (and add/remove) navigates
 * that param via {@link ReportSession.goToTab} rather than mutating the model
 * directly. Each also drops the canvas selection and resets the panel — the
 * selected widget belongs to the tab being left behind.
 */
@Injectable()
export class TabCommands {
  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly navigation = inject(PanelNavigation);

  /** Switches the visible tab by navigating the `tab` query param. */
  selectTab(tabId: string): void {
    if (this.session.activeTabId() === tabId) return;
    this.session.goToTab(tabId);
    this.selection.clear();
    this.navigation.navigate({ kind: 'widgets' });
  }

  addTab(): void {
    const tab = this.session.model()?.addTab();
    if (!tab) return;
    this.session.goToTab(tab.id);
    this.selection.clear();
    this.navigation.navigate({ kind: 'widgets' });
  }

  removeTab(tabId: string): void {
    const model = this.session.model();
    if (!model) return;
    const tabs = model.tabs();
    if (tabs.length <= 1) return;

    // Pick the survivor to open up front so removing the active tab lands on its
    // neighbour rather than briefly pointing the URL at a tab that's gone.
    const index = tabs.findIndex((t) => t.id === tabId);
    const remaining = tabs.filter((t) => t.id !== tabId);
    const neighbour = remaining[Math.min(index, remaining.length - 1)];
    const wasActive = this.session.activeTabId() === tabId;

    model.removeTab(tabId);
    this.selection.clear();
    if (wasActive && neighbour) this.session.goToTab(neighbour.id, true);
  }

  renameTab(tabId: string, name: string): void {
    this.session.model()?.renameTab(tabId, name);
  }

  moveTab(tabId: string, toIndex: number): void {
    this.session.model()?.moveTab(tabId, toIndex);
  }
}
