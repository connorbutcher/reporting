import { CanDeactivateFn } from '@angular/router';
import { ReportCanvasComponent } from './report-canvas.component';

export class UnsavedChangesGuard {
  /** Blocks in-app navigation away from the builder while a save is unconfirmed. */
  public static readonly canDeactivate: CanDeactivateFn<ReportCanvasComponent> = (component) =>
    component.canLeave();
}
