/**
 * Errors mean the report is broken and must not be saved. Warnings mean it is
 * merely unfinished — a table with no dataset yet is expected right after it is
 * added, so those must never block saving or new widgets could never persist.
 */
export type IssueSeverity = 'error' | 'warning';
