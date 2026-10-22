import { CreateKind } from './create-kind';

export type CreateDialogResult = {
  kind: CreateKind;
  name: string;
  /** Set when the user picked an existing report to start from — undefined means start blank. */
  sourceReportId?: number;
};
