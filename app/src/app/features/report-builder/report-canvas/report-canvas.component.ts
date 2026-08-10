import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { CELL_SIZE, GRID_GAP, GridPreview } from '../grid.util';
import { PublishDialogComponent } from '../publish-dialog/publish-dialog.component';
import { ReportBuilderStore } from '../report-builder.store';
import { ReportSidePanelComponent } from '../side-panel/report-side-panel.component';
import { WidgetHostComponent } from '../widget-host/widget-host.component';

/** Nudging by a whole cell keeps widgets on the grid. */
const NUDGE = 1;

@Component({
  selector: 'app-report-canvas',
  imports: [WidgetHostComponent, ReportSidePanelComponent],
  templateUrl: './report-canvas.component.html',
  styleUrl: './report-canvas.component.scss',
  providers: [ReportBuilderStore],
  host: {
    '(document:keydown)': 'onKeyDown($event)',
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class ReportCanvasComponent implements OnInit {
  protected readonly store = inject(ReportBuilderStore);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(Dialog);

  protected readonly cellSize = CELL_SIZE;
  protected readonly gridGap = GRID_GAP;
  protected readonly dropPreview = signal<GridPreview | null>(null);

  protected readonly statusLabel = computed(() => {
    if (this.store.saveBlocked()) return 'Not saving — fix errors';

    const errors = this.store.errors().length;
    const warnings = this.store.warnings().length;
    if (errors) return `${errors} error${errors > 1 ? 's' : ''}`;
    if (warnings) return `${warnings} warning${warnings > 1 ? 's' : ''}`;
    return 'No issues';
  });

  protected readonly publishTitle = computed(() => {
    if (!this.store.isValid()) return 'Fix errors before publishing';
    if (!this.store.hasUnpublishedChanges()) return 'No changes to publish';
    return 'Publish this draft as a new version';
  });

  protected readonly saveStatus = computed(() => {
    if (this.store.saveFailed()) return { label: 'Save failed', icon: 'pi-exclamation-circle', variant: 'error' };
    if (this.store.saving()) return { label: 'Saving…', icon: 'pi-spin pi-spinner', variant: 'pending' };
    if (this.store.dirty()) return { label: 'Unsaved changes', icon: 'pi-circle-fill', variant: 'pending' };
    return { label: 'Saved', icon: 'pi-check', variant: 'ok' };
  });

  ngOnInit(): void {
    const reportId = this.route.snapshot.paramMap.get('reportId');
    if (reportId) this.store.load(reportId);
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
        : 'You have changes that haven\'t finished saving. Leave anyway?',
    );
  }

  protected publish(): void {
    const ref = this.dialog.open<string | null>(PublishDialogComponent);
    ref.closed.subscribe((notes) => {
      // undefined means the dialog was cancelled or dismissed.
      if (notes === undefined) return;
      this.store.publish(notes);
    });
  }

  protected onDropPreview(preview: GridPreview | null): void {
    this.dropPreview.set(preview);
  }

  /** Clicking empty canvas drops the selection. */
  protected onCanvasPointerDown(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.store.clearSelection();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    // Never steal keys from a field the user is typing in.
    if (isTextEntry(event.target)) return;

    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.store.redo();
      else this.store.undo();
      return;
    }

    if (ctrl && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.store.redo();
      return;
    }

    if (ctrl && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.store.duplicateSelection();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const ids = this.store.selectedWidgetIds();
      if (ids.length === 0) return;
      event.preventDefault();
      this.store.removeWidgets(ids);
      return;
    }

    if (event.key === 'Escape') {
      this.store.clearSelection();
      return;
    }

    const nudge = NUDGE_KEYS[event.key];
    if (nudge && this.store.selectedWidgetIds().length > 0) {
      event.preventDefault();
      this.store.nudgeSelection(nudge.dx, nudge.dy);
    }
  }
}

const NUDGE_KEYS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -NUDGE, dy: 0 },
  ArrowRight: { dx: NUDGE, dy: 0 },
  ArrowUp: { dx: 0, dy: -NUDGE },
  ArrowDown: { dx: 0, dy: NUDGE },
};

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
