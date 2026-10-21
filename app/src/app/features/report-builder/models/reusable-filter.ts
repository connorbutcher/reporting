import { FilterGroupModel } from './filter';

export interface ReusableFilter {
  readonly label: string;
  readonly group: FilterGroupModel;
}
