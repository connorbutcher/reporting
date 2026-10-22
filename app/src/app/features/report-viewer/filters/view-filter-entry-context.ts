import { Signal, computed } from '@angular/core';
import { DatasetSchema } from '../../../core/models/dataset';
import { FilterGroup, OperatorCatalogue } from '../../../core/models/filter';
import { FilterGroupModel } from '../../report-builder/models/filter';
import { GroupScope } from './group-scope';

/** What building entries needs from the report: schemas, operators, and the banded columns seen so far. */
export class ViewFilterEntryContext {
  private readonly schemaSignals = new Map<number, Signal<DatasetSchema | null>>();
  private readonly tolerantByDataset = new Map<number, Set<string>>();

  constructor(
    private readonly schemas: Signal<Record<number, DatasetSchema>>,
    private readonly catalogue: Signal<OperatorCatalogue | null>,
  ) {}

  public schemaFor(datasetId: number): Signal<DatasetSchema | null> {
    let schema = this.schemaSignals.get(datasetId);
    if (!schema) {
      schema = computed(() => this.schemas()[datasetId] ?? null);
      this.schemaSignals.set(datasetId, schema);
    }
    return schema;
  }

  /** Columns banded anywhere on a dataset, so its page filter offers the same tolerance operators. */
  public addTolerant(datasetId: number, columnIds: readonly string[]): void {
    const set = this.tolerantByDataset.get(datasetId) ?? new Set<string>();
    for (const columnId of columnIds) {
      set.add(columnId);
    }
    this.tolerantByDataset.set(datasetId, set);
  }

  public tolerantColumns(datasetId: number): ReadonlySet<string> {
    return this.tolerantByDataset.get(datasetId) ?? new Set();
  }

  /** Deep-copies the published filter, so editing never touches the revision `reset()` restores from. */
  public buildGroup(
    published: FilterGroup | null,
    schema: Signal<DatasetSchema | null>,
    ownerId: string,
    scope: GroupScope,
  ): FilterGroupModel {
    const copy = published ? (JSON.parse(JSON.stringify(published)) as FilterGroup) : null;
    return new FilterGroupModel(copy, { schema, catalogue: this.catalogue, ownerId, ...scope });
  }
}
