import { FolderRow } from './folder-row';
import { ReportRow } from './report-row';

/**
 * A folder or report, normalized to one shape so both can share row-action logic. A discriminated
 * union rather than one interface with optional fields: narrowing on `kind` gets `.folder`/`.report`
 * (and the report-only `.number`/`.status`/`.statusKind`) without a non-null assertion at every use site.
 */
export type ContentRow = FolderRow | ReportRow;
