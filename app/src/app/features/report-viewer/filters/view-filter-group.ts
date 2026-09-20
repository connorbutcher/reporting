import { Signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import { FilterGroup, OperatorCatalogue } from '../../../core/models/filter';
import { FilterGroupModel } from '../../report-builder/models/filter';

/** What building an entry needs from the report: schemas, operators, and where to record banded columns. */
export interface EntryContext {
  readonly schemaFor: (datasetId: number) => Signal<DatasetSchema | null>;
  readonly catalogue: Signal<OperatorCatalogue | null>;
  /** Columns banded anywhere on a dataset, so its page filter offers the same tolerance operators. */
  readonly addTolerant: (datasetId: number, columnIds: readonly string[]) => void;
}

interface GroupScope {
  columns?: Signal<DatasetColumn[]>;
  tolerantColumns: Signal<ReadonlySet<string>>;
}

/** Deep-copies the published filter, so editing never touches the published revision `reset()` restores from. */
export function buildViewFilterGroup(
  published: FilterGroup | null,
  schema: Signal<DatasetSchema | null>,
  catalogue: Signal<OperatorCatalogue | null>,
  ownerId: string,
  scope: GroupScope,
): FilterGroupModel {
  const copy = published ? (JSON.parse(JSON.stringify(published)) as FilterGroup) : null;
  return new FilterGroupModel(copy, { schema, catalogue, ownerId, ...scope });
}
