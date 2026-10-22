import { Service } from '@angular/core';

/** Non-user-facing diagnostics; the place to wire a telemetry sink later. */
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
