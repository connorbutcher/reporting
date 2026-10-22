import { OpenableReport } from './openable-report.model';
import { ReportOpenOption } from './report-open-option.model';

export class ReportOpening {
  /** The ways this user can open the report, most expected first. Viewers only get the published view. */
  public static options(report: OpenableReport): ReportOpenOption[] {
    const options: ReportOpenOption[] = [];
    if (ReportOpening.hasPublishedVersion(report)) {
      options.push({
        kind: 'view',
        label: 'Open published',
        icon: 'pi pi-eye',
        route: ['/reports', report.id],
      });
    }
    if (ReportOpening.canEdit(report)) {
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
  public static defaultOption(report: OpenableReport): ReportOpenOption | null {
    return ReportOpening.options(report)[0] ?? null;
  }

  /** Whether the current user may edit the report (Editor or Manager). */
  private static canEdit(report: Pick<OpenableReport, 'accessLevel'>): boolean {
    return report.accessLevel === 'editor' || report.accessLevel === 'manager';
  }

  /** Whether the report has a published version to view. */
  private static hasPublishedVersion(report: Pick<OpenableReport, 'latestVersionNumber'>): boolean {
    return report.latestVersionNumber != null;
  }
}
