/**
 * Errors block saving. Warnings mean unfinished, such as a new table with no dataset yet, and must
 * never block saving.
 */
export type IssueSeverity = 'error' | 'warning';
