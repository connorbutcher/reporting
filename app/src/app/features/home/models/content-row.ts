import { FolderRow } from './folder-row';
import { ReportRow } from './report-row';

/** A folder or report in one shape for row actions; narrow on `kind`. */
export type ContentRow = FolderRow | ReportRow;
