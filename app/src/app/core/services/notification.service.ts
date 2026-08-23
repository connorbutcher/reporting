import { Service, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/** How long a toast stays up before auto-dismissing, in ms. Errors linger longer. */
const DEFAULT_LIFE = 3000;
const ERROR_LIFE = 5000;

/**
 * The app-wide way to show a transient message to the user. Wraps PrimeNG's
 * {@link MessageService} — which drives the single `<p-toast>` mounted at the app
 * root — behind a small, intent-named API so callers never assemble severities or
 * `Message` objects themselves.
 *
 * Stores and their command collaborators inject this to report the outcome of an
 * action (a save that failed, a report that published). Components don't: they go
 * through their screen's store like everything else.
 */
@Service()
export class NotificationService {
  private readonly messages = inject(MessageService);

  /** A completed action, e.g. "Report published". */
  success(detail: string, summary = 'Success'): void {
    this.messages.add({ severity: 'success', summary, detail, life: DEFAULT_LIFE });
  }

  /** Neutral information the user didn't explicitly trigger. */
  info(detail: string, summary = 'Info'): void {
    this.messages.add({ severity: 'info', summary, detail, life: DEFAULT_LIFE });
  }

  /** A caution that isn't an outright failure, e.g. a partial or skipped action. */
  warn(detail: string, summary = 'Warning'): void {
    this.messages.add({ severity: 'warn', summary, detail, life: DEFAULT_LIFE });
  }

  /** Something the user tried to do failed; kept up longer so it's read. */
  error(detail: string, summary = 'Something went wrong'): void {
    this.messages.add({ severity: 'error', summary, detail, life: ERROR_LIFE });
  }

  /** Removes any toasts currently on screen. */
  clear(): void {
    this.messages.clear();
  }
}
