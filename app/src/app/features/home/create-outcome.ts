/** What a completed create resolved to, so the page can reload or open the new report. */
export type CreateOutcome = { kind: 'folder' } | { kind: 'report'; reportId: number };
