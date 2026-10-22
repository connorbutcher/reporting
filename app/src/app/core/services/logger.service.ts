import { Service } from '@angular/core';

/**
 * A thin logging seam for diagnostics that aren't user-facing (unlike
 * {@link NotificationService}, which shows toasts). Console-backed today; the one
 * place to wire a real telemetry sink (Application Insights, Sentry, …) later
 * without touching every call site.
 */
@Service()
export class LoggerService {
  public error(message: string, error?: unknown): void {
    console.error(message, error);
  }

  public warn(message: string, detail?: unknown): void {
    console.warn(message, detail);
  }

  public info(message: string, detail?: unknown): void {
    console.info(message, detail);
  }
}
