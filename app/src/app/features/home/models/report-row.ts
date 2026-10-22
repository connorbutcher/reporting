import { ContentRowBase } from './content-row-base';
import { AccessLevel } from '../../../core/models/permission';
import { ReportSummary } from '../../../core/models/report';

/** A report, normalized into the shared row shape. `statusKind` drives the status stripe/text colour. */
export type ReportRow = ContentRowBase & {
  kind: 'report';
  number: number;
  status: string;
  statusKind: 'draft' | 'published' | 'empty';
  /** The current user's access — drives whether editing is offered on the row. */
  accessLevel: AccessLevel;
  /** Whether the current user has starred this report — drives the star toggle's filled state. */
  isFavorite: boolean;
  report: ReportSummary;
};
