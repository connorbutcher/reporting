import { Component, inject } from '@angular/core';
import { ReportSidePanelComponent } from '../side-panel/report-side-panel.component';
import { DatasetSchema } from '../state/dataset-schema';
import { PanelNavigation } from '../state/panel-navigation';
import { ReportAutosave } from '../state/report-autosave';
import { ReportLifecycle } from '../state/report-lifecycle';
import { ReportSession } from '../state/report-session';
import { TabCommands } from '../state/tab-commands';
import { WidgetCommands } from '../state/widget-commands';
import { WidgetSelection } from '../state/widget-selection';
import { BuilderShortcutsDirective } from './builder-shortcuts.directive';
import { BuilderTopbarComponent } from './builder-topbar/builder-topbar.component';
import { CanvasGridComponent } from './canvas-grid/canvas-grid.component';
import { CanvasStatusComponent } from './canvas-status/canvas-status.component';
import { CanvasTabsComponent } from './canvas-tabs/canvas-tabs.component';

/**
 * The report builder screen. A thin shell: it provides the state services (see
 * `providers` below) — which load the report reactively from the route id
 * themselves — guards against leaving with unsaved changes, and lays out the
 * toolbar, canvas, and side panel. Everything else lives in those services and
 * the child components, which inject the ones they need directly.
 */
@Component({
  selector: 'app-report-canvas',
  imports: [
    BuilderTopbarComponent,
    CanvasTabsComponent,
    CanvasGridComponent,
    CanvasStatusComponent,
    ReportSidePanelComponent,
    BuilderShortcutsDirective,
  ],
  templateUrl: './report-canvas.component.html',
  styleUrl: './report-canvas.component.scss',
  // The report-builder state is split across focused collaborator services; all
  // are provided here so they share one component-scoped instance per screen, and
  // the sub-components inject the ones they need directly.
  providers: [
    WidgetSelection,
    ReportSession,
    PanelNavigation,
    ReportAutosave,
    DatasetSchema,
    ReportLifecycle,
    WidgetCommands,
    TabCommands,
  ],
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class ReportCanvasComponent {
  // Injected so the component-scoped services are constructed and their route-driven
  // load kicks off; also read below for the unsaved-changes guards.
  private readonly lifecycle = inject(ReportLifecycle);
  private readonly autosave = inject(ReportAutosave);

  /** Browser-level guard for closing the tab or reloading. */
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.lifecycle.hasUnsavedRisk()) return;
    event.preventDefault();
    // Chrome ignores the message and shows its own; older browsers read it.
    event.returnValue = true;
  }

  /** In-app guard for navigating away, e.g. back to the home page. Public so the route guard can call it. */
  canLeave(): boolean {
    if (!this.lifecycle.hasUnsavedRisk()) return true;
    return window.confirm(
      this.autosave.saveFailed()
        ? 'The last save failed, so recent changes may not be stored. Leave anyway?'
        : "You have changes that haven't finished saving. Leave anyway?",
    );
  }
}
