import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { DatasetCountResult, FilterGroup, combineFilters } from '../../../../../core/models/filter';
import { FilterGroupModel } from '../../../models/filter';
import { MatchState, liveMatchCount } from '../live-match-count';

/** "Matches N of M rows" for the filter being edited, folded together with whatever else already narrows the dataset. */
@Component({
  selector: 'app-filter-match-count',
  imports: [DecimalPipe],
  templateUrl: './filter-match-count.component.html',
  styleUrl: './filter-match-count.component.scss',
})
export class FilterMatchCountComponent {
  public readonly group = input.required<FilterGroupModel>();
  /** Filters outside the group being edited (the report filter, or a session-adjusted page filter), so the count reflects what renders. */
  public readonly additionalFilter = input<FilterGroup | null>(null);

  // The key is inlined so it stays a closure over the inputs: reading toQueryDto() tracks every
  // condition, operator and value, so the count re-runs as the filter is edited.
  public readonly match = liveMatchCount(
    computed(() => {
      const group = this.group();
      const datasetId = group.datasetId();
      if (!group.ready() || datasetId === null) return null;
      return { datasetId, filter: combineFilters(this.additionalFilter(), group.toQueryDto()) };
    }),
    inject(DatasetApiService),
  );

  /** The latest counts, held across a re-check so the readout keeps its numbers (dimmed) instead of blanking. */
  public readonly numbers = linkedSignal<MatchState, DatasetCountResult | null>({
    source: this.match,
    computation: (match, previous) => {
      if (match.state === 'ready') return match.result;
      return match.state === 'idle' ? null : (previous?.value ?? null);
    },
  });
}
