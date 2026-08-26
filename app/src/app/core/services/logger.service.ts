import { Service } from '@angular/core';

/**
 * A thin logging seam for diagnostics that aren't user-facing (unlike
 * {@link NotificationService}, which shows toasts). Console-backed today; the one
 * place to wire a real telemetry sink (Application Insights, Sentry, …) later
 * without touching every call site.
 */
@Service()
export class LoggerService {
  error(message: string, error?: unknown): void {
    console.error(message, error);
  }

  warn(message: string, detail?: unknown): void {
    console.warn(message, detail);
  }

  info(message: string, detail?: unknown): void {
    console.info(message, detail);
  }
}
