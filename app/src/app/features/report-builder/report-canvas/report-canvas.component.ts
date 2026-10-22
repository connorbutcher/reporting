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
 * The report builder screen: provides the state services, guards against leaving with unsaved
 * changes, and lays out the toolbar, canvas and side panel.
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
  // One instance of each state service per screen; child components inject what they need.
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
  // Injecting it starts the route-driven load.
  private readonly lifecycle = inject(ReportLifecycle);
  private readonly autosave = inject(ReportAutosave);

  /** Guards closing the tab or reloading. */
  public onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.lifecycle.hasUnsavedRisk()) {
      return;
    }
    event.preventDefault();
    // Chrome shows its own message; older browsers read this.
    event.returnValue = true;
  }

  /** Guards in-app navigation; called by the route guard. */
  public canLeave(): boolean {
    if (!this.lifecycle.hasUnsavedRisk()) {
      return true;
    }
    return window.confirm(
      this.autosave.saveFailed()
        ? 'The last save failed, so recent changes may not be stored. Leave anyway?'
        : "You have changes that haven't finished saving. Leave anyway?",
    );
  }
}
