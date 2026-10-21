import { Injectable, inject } from '@angular/core';
import { PanelNavigation } from './panel-navigation';
import { ReportSession } from './report-session';
import { WidgetSelection } from './widget-selection';

/**
 * Adds, removes, renames, reorders and switches tabs. The active tab lives in the `tab` query param,
 * so switching navigates it. Each also clears the selection and resets the panel.
 */
@Injectable()
export class TabCommands {
  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly navigation = inject(PanelNavigation);

  public selectTab(tabId: string): void {
    if (this.session.activeTabId() === tabId) return;
    this.session.goToTab(tabId);
    this.selection.clear();
    this.navigation.navigate({ kind: 'widgets' });
  }

  public addTab(): void {
    const tab = this.session.model()?.addTab();
    if (!tab) return;
    this.session.goToTab(tab.id);
    this.selection.clear();
    this.navigation.navigate({ kind: 'widgets' });
  }

  public removeTab(tabId: string): void {
    const model = this.session.model();
    if (!model) return;
    const tabs = model.tabs();
    if (tabs.length <= 1) return;

    // Pick the neighbour first so the URL never points at a removed tab.
    const index = tabs.findIndex((t) => t.id === tabId);
    const remaining = tabs.filter((t) => t.id !== tabId);
    const neighbour = remaining[Math.min(index, remaining.length - 1)];
    const wasActive = this.session.activeTabId() === tabId;

    model.removeTab(tabId);
    this.selection.clear();
    if (wasActive && neighbour) this.session.goToTab(neighbour.id, true);
  }

  public renameTab(tabId: string, name: string): void {
    this.session.model()?.renameTab(tabId, name);
  }

  public moveTab(tabId: string, toIndex: number): void {
    this.session.model()?.moveTab(tabId, toIndex);
  }
}
