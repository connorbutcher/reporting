import { FilterGroupModel } from './filter';

/** A filter elsewhere on the report that could be copied into the one being edited. */
export interface ReusableFilter {
  readonly label: string;
  readonly group: FilterGroupModel;
}
