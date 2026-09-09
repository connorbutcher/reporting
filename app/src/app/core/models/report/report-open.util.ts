import { AccessLevel } from '../permission';

/** The minimal report identity the open logic needs — satisfied by both ReportSummary and ReportSearchResult. */
export interface OpenableReport {
  id: number;
  hasDraft: boolean;
  latestVersionNumber: number | null;
  accessLevel: AccessLevel;
}

/** One way to open a report: a label, an icon, and the router link that opens it. */
export interface ReportOpenOption {
  kind: 'view' | 'edit';
  label: string;
  icon: string;
  route: (string | number)[];
}

/** Whether the current user may edit the report (Editor or Manager). */
export function canEditReport(report: Pick<OpenableReport, 'accessLevel'>): boolean {
  return report.accessLevel === 'editor' || report.accessLevel === 'manager';
}

/** Whether the report has a published version to view. */
export function hasPublishedVersion(report: Pick<OpenableReport, 'latestVersionNumber'>): boolean {
  return report.latestVersionNumber != null;
}

/**
 * The ways this user can open the report, most-expected first. When both are present — an editor
 * looking at a report that also has a published version — the two are offered side by side, and the
 * report-vs-draft ambiguity is resolved by naming each explicitly ("Open published" vs "Edit draft").
 * A viewer only ever gets the published view; a report with no published version is never shown to a
 * non-editor at all (the server hides it), so a lone "Edit" only ever reaches someone who can edit.
 */
export function reportOpenOptions(report: OpenableReport): ReportOpenOption[] {
  const options: ReportOpenOption[] = [];
  if (hasPublishedVersion(report)) {
    options.push({ kind: 'view', label: 'Open published', icon: 'pi pi-eye', route: ['/reports', report.id] });
  }
  if (canEditReport(report)) {
    options.push({
      kind: 'edit',
      label: report.hasDraft ? 'Edit draft' : 'Edit',
      icon: 'pi pi-pencil',
      route: ['/reports', report.id, 'edit'],
    });
  }
  return options;
}

/** The single default open action — the published view when there is one, otherwise editing. Null if neither applies. */
export function defaultOpenOption(report: OpenableReport): ReportOpenOption | null {
  return reportOpenOptions(report)[0] ?? null;
}
