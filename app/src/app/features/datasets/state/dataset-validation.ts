import { Injectable, computed, inject } from '@angular/core';
import { DatasetColumn, DatasetSourceConfig } from '../../../core/models/dataset';
import { DatasetCollection } from './dataset-collection';
import { DatasetIssue } from './dataset-issue';
import { DatasetSchemaState } from './dataset-schema-state';

/**
 * Validates the datasets on the current report, the way the report builder
 * validates its widgets. A dataset is invalid if it shares its name with
 * another, has no columns or duplicate column names, or its source isn't
 * configured.
 *
 * Only the name clash can be judged across the whole list — the columns and
 * source config are loaded per selected dataset — so {@link nameConflictIds}
 * marks the sidebar and {@link selectedIssues} gives the full picture for the
 * open one. Provided on the datasets page; {@link DatasetsStore} re-exposes it.
 */
@Injectable()
export class DatasetValidation {
  private readonly collection = inject(DatasetCollection);
  private readonly schema = inject(DatasetSchemaState);

  /** Dataset ids whose name (trimmed, case-insensitive) collides with another dataset's. */
  readonly nameConflictIds = computed(() => {
    const byName = new Map<string, number[]>();
    for (const dataset of this.collection.datasets()) {
      const key = dataset.name.trim().toLowerCase();
      const ids = byName.get(key);
      if (ids) ids.push(dataset.id);
      else byName.set(key, [dataset.id]);
    }

    const conflicts = new Set<number>();
    for (const ids of byName.values()) {
      if (ids.length > 1) for (const id of ids) conflicts.add(id);
    }
    return conflicts;
  });

  /** Every validation problem with the currently selected dataset, most severe first. */
  readonly selectedIssues = computed<DatasetIssue[]>(() => {
    const selected = this.collection.selected();
    if (!selected) return [];

    const issues: DatasetIssue[] = [];

    if (this.nameConflictIds().has(selected.id)) {
      issues.push({
        id: 'duplicate-name',
        severity: 'error',
        title: 'Duplicate name',
        detail: `Another dataset is also called "${selected.name}". Rename one so they can be told apart.`,
      });
    }

    // Columns and source are only known once the schema has loaded; skip those
    // checks while it's loading or failed (the editor shows its own load error),
    // so an empty in-flight schema isn't mistaken for a dataset with no columns.
    if (this.schema.schemaLoading() || this.schema.error()) return issues;

    const columns = this.schema.columns();
    if (columns.length === 0) {
      issues.push({
        id: 'no-columns',
        severity: 'error',
        title: 'No columns',
        detail: 'This dataset has no columns, so nothing can be read from it.',
      });
    } else {
      const duplicates = duplicateColumnNames(columns);
      if (duplicates.length) {
        issues.push({
          id: 'duplicate-columns',
          severity: 'error',
          title: 'Duplicate columns',
          detail: `More than one column is named ${duplicates
            .map((name) => `"${name}"`)
            .join(', ')}. Column names must be unique.`,
        });
      }
    }

    const sourceIssue = sourceConfigIssue(this.schema.sourceConfig());
    if (sourceIssue) issues.push(sourceIssue);

    return issues;
  });
}

/** The distinct names shared by more than one column (trimmed, case-insensitive). */
function duplicateColumnNames(columns: readonly DatasetColumn[]): string[] {
  const seen = new Map<string, { name: string; count: number }>();
  for (const column of columns) {
    const key = column.name.trim().toLowerCase();
    const entry = seen.get(key);
    if (entry) entry.count++;
    else seen.set(key, { name: column.name.trim() || '(unnamed)', count: 1 });
  }
  return [...seen.values()].filter((entry) => entry.count > 1).map((entry) => entry.name);
}

/** The problem with a source's configuration, or null when it's valid (or still loading). */
function sourceConfigIssue(config: DatasetSourceConfig | null): DatasetIssue | null {
  if (!config) return null;

  switch (config.source) {
    case 'assembly':
    case 'disassembly':
      if (config.typeId == null) {
        return {
          id: 'source-config',
          severity: 'warning',
          title: 'Source not configured',
          detail: 'Choose the source-system type this dataset draws from.',
        };
      }
      if (config.phaseIds.length === 0) {
        return {
          id: 'source-config',
          severity: 'warning',
          title: 'No phases selected',
          detail: 'Add at least one phase for the source to pull data from.',
        };
      }
      return null;
    case 'specification':
      return null;
  }
}
