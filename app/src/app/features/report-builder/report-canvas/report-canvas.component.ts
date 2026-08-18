import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReportBuilderStore } from '../report-builder.store';
import { ReportSidePanelComponent } from '../side-panel/report-side-panel.component';
import { BuilderShortcutsDirective } from './builder-shortcuts.directive';
import { BuilderToolbarComponent } from './builder-toolbar/builder-toolbar.component';
import { CanvasGridComponent } from './canvas-grid/canvas-grid.component';

/**
 * The report builder screen. A thin shell: it provides the
 * {@link ReportBuilderStore}, loads the report from the route, guards against
 * leaving with unsaved changes, and lays out the toolbar, canvas, and side
 * panel. Everything else lives in the store and the child components.
 */
@Component({
  selector: 'app-report-canvas',
  imports: [
    BuilderToolbarComponent,
    CanvasGridComponent,
    ReportSidePanelComponent,
    BuilderShortcutsDirective,
  ],
  templateUrl: './report-canvas.component.html',
  styleUrl: './report-canvas.component.scss',
  providers: [ReportBuilderStore],
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class ReportCanvasComponent implements OnInit {
  private readonly store = inject(ReportBuilderStore);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const reportId = this.route.snapshot.paramMap.get('reportId');
    if (reportId) this.store.load(Number(reportId));
  }

  /** Browser-level guard for closing the tab or reloading. */
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.store.hasUnsavedRisk()) return;
    event.preventDefault();
    // Chrome ignores the message and shows its own; older browsers read it.
    event.returnValue = true;
  }

  /** In-app guard for navigating away, e.g. back to the home page. Public so the route guard can call it. */
  canLeave(): boolean {
    if (!this.store.hasUnsavedRisk()) return true;
    return window.confirm(
      this.store.saveFailed()
        ? 'The last save failed, so recent changes may not be stored. Leave anyway?'
        : "You have changes that haven't finished saving. Leave anyway?",
    );
  }
}
