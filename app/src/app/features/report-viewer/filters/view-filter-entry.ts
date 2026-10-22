import { Signal } from '@angular/core';
import { FilterGroupModel } from '../../report-builder/models/filter';
import { FilterGroup } from '../../../core/models/filter';

/** One editable filter in the viewer's panel. */
export type ViewFilterEntry = {
  /** A dataset id (page filter) or widget id (widget filter; chart bindings use {@link ViewFilterEntryFactory.chartBindingKey}). */
  readonly key: string;
  readonly datasetId: number;
  readonly group: FilterGroupModel;
  readonly published: FilterGroup | null;
  /** Moved away from what was published. */
  readonly changed: Signal<boolean>;
  /** The finished filter when it differs from published, else undefined: what gets saved or shared. */
  readonly override: Signal<FilterGroup | null | undefined>;
  readonly summary: Signal<string>;
};
