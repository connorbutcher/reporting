import { FilterGroupModel } from './filter';

export type ReusableFilter = {
  readonly label: string;
  readonly group: FilterGroupModel;
};
