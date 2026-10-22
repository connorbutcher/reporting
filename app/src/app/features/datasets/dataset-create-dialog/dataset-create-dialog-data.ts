import { DatasetSource } from '../../../core/models/dataset';

export type DatasetCreateDialogData = {
  sources: DatasetSource[];
  /** The report's existing dataset names, so a duplicate is rejected inline. */
  existingNames: string[];
};
