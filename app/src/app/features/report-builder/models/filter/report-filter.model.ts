import { Signal, computed } from '@angular/core';
import { FilterGroup, ReportFilter } from '../../../../core/models/filter';
import { EditorNode } from '../editor-node';
import { ValidationIssue } from '../validation-issue';
import { FilterContext } from './filter-context';
import { FilterGroupModel } from './filter-group.model';

/** A report-level filter for one dataset, AND-ed with each widget's own filter on that dataset. */
export class ReportFilterModel extends EditorNode {
  public readonly datasetId: number;
  public readonly group: FilterGroupModel;
  public readonly datasetName: Signal<string>;

  constructor(datasetId: number, dto: FilterGroup | null, context: FilterContext) {
    super();
    this.datasetId = datasetId;
    this.group = new FilterGroupModel(dto, context);
    this.datasetName = computed(() => context.schema()?.name ?? 'Unknown dataset');
  }

  public toDto(): ReportFilter | null {
    const filter = this.group.toDto();
    return filter ? { datasetId: this.datasetId, filter } : null;
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.group];
  }

  public override ownIssues(): ValidationIssue[] {
    return [];
  }
}
