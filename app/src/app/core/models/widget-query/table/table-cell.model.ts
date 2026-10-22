import { ToleranceStatus } from './tolerance-status.model';

export type TableCell = {
  displayValue: string | null;
  /** The typed value: a number, true/false, a date as an ISO string, or text. Null for a blank cell. */
  value?: number | string | boolean | null;
  tolerance: ToleranceStatus;
};
