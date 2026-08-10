import { CanDeactivateFn } from '@angular/router';
import { ReportCanvasComponent } from './report-canvas.component';

/** Blocks in-app navigation away from the builder while a save is unconfirmed. */
export const unsavedChangesGuard: CanDeactivateFn<ReportCanvasComponent> = (component) =>
  component.canLeave();
