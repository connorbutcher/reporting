import { Injectable, computed, inject } from '@angular/core';
import { DatasetColumn, DatasetSourceConfig, DatasetSummary } from '../../../core/models/dataset';
import { DatasetCollection } from './dataset-collection';
import { DatasetIssue } from './dataset-issue';
import { DatasetSchemaState } from './dataset-schema-state';

@Injectable()
export class DatasetValidation {
  /** Dataset ids whose name collides with another dataset's. */
  public readonly nameConflictIds = computed(() => {
    const groups = DatasetValidation.sameNameGroups(this.collection.datasets(), (d) => d.name);
    return new Set(groups.flatMap((group) => group.map((dataset) => dataset.id)));
  });

  /** Every validation problem with the currently selected dataset, most severe first. */
  public readonly selectedIssues = computed<DatasetIssue[]>(() => {
    const selected = this.collection.selected();
    if (!selected) {
      return [];
    }
    const nameIssue = this.nameIssue(selected);
    // Columns and source are unknown until the schema loads; an in-flight schema isn't "no columns".
    if (this.schema.schemaLoading() || this.schema.error()) {
      return nameIssue ? [nameIssue] : [];
    }
    return [
      nameIssue,
      DatasetValidation.columnIssue(this.schema.columns()),
      DatasetValidation.sourceConfigIssue(this.schema.sourceConfig()),
    ].filter((issue): issue is DatasetIssue => issue !== null);
  });

  private readonly collection = inject(DatasetCollection);

  private readonly schema = inject(DatasetSchemaState);

  private static columnIssue(columns: readonly DatasetColumn[]): DatasetIssue | null {
    if (columns.length === 0) {
      return DatasetValidation.error(
        'no-columns',
        'No columns',
        'This dataset has no columns, so nothing can be read from it.',
      );
    }
    const duplicates = DatasetValidation.sameNameGroups(columns, (c) => c.name).map(
      (group) => group[0].name.trim() || '(unnamed)',
    );
    if (duplicates.length === 0) {
      return null;
    }
    const names = duplicates.map((name) => `"${name}"`).join(', ');
    return DatasetValidation.error(
      'duplicate-columns',
      'Duplicate columns',
      `More than one column is named ${names}. Column names must be unique.`,
    );
  }

  /** Null when the config is valid or still loading. */
  private static sourceConfigIssue(config: DatasetSourceConfig | null): DatasetIssue | null {
    switch (config?.source) {
      case 'assembly':
      case 'disassembly':
        if (config.typeId == null) {
          return DatasetValidation.sourceWarning(
            'Source not configured',
            'Choose the source-system type this dataset draws from.',
          );
        }
        return config.phaseIds.length === 0
          ? DatasetValidation.sourceWarning(
              'No phases selected',
              'Add at least one phase for the source to pull data from.',
            )
          : null;
      case 'filtered':
        return config.baseDatasetId == null
          ? DatasetValidation.sourceWarning(
              'Source not configured',
              'Choose the dataset this one filters.',
            )
          : null;
      default:
        return null;
    }
  }

  /** Groups of two or more items sharing a name (trimmed, case-insensitive), in first-seen order. */
  private static sameNameGroups<T>(items: readonly T[], nameOf: (item: T) => string): T[][] {
    const byName = new Map<string, T[]>();
    for (const item of items) {
      const key = nameOf(item).trim().toLowerCase();
      byName.set(key, [...(byName.get(key) ?? []), item]);
    }
    return [...byName.values()].filter((group) => group.length > 1);
  }

  private static error(id: string, title: string, detail: string): DatasetIssue {
    return { id, severity: 'error', title, detail };
  }

  private static sourceWarning(title: string, detail: string): DatasetIssue {
    return { id: 'source-config', severity: 'warning', title, detail };
  }

  private nameIssue(selected: DatasetSummary): DatasetIssue | null {
    if (!this.nameConflictIds().has(selected.id)) {
      return null;
    }
    return DatasetValidation.error(
      'duplicate-name',
      'Duplicate name',
      `Another dataset is also called "${selected.name}". Rename one so they can be told apart.`,
    );
  }
}
