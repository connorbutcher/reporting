import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { DatasetApiService } from '../../../../../core/api/dataset-api.service';
import { DatasetCountResult, FilterGroup, FilterTrees } from '../../../../../core/models/filter';
import { FilterGroupModel } from '../../../models/filter';
import { LiveMatchCount } from '../live-match-count';
import { MatchState } from '../match-state';

/** "Matches N of M rows" for the filter being edited, combined with whatever else narrows the dataset. */
@Component({
  selector: 'app-filter-match-count',
  imports: [DecimalPipe],
  templateUrl: './filter-match-count.component.html',
  styleUrl: './filter-match-count.component.scss',
})
export class FilterMatchCountComponent {
  public readonly group = input.required<FilterGroupModel>();
  /** Filters outside this group (the report or page filter), so the count matches what renders. */
  public readonly additionalFilter = input<FilterGroup | null>(null);

  // Inlined so reading toQueryDto() tracks every condition edit.
  public readonly match = LiveMatchCount.create(
    computed(() => {
      const group = this.group();
      const datasetId = group.datasetId();
      if (!group.ready() || datasetId === null) {
        return null;
      }
      return {
        datasetId,
        filter: FilterTrees.combine(this.additionalFilter(), group.toQueryDto()),
      };
    }),
    inject(DatasetApiService),
  );

  /** Held across a re-check so the readout dims instead of blanking. */
  public readonly numbers = linkedSignal<MatchState, DatasetCountResult | null>({
    source: this.match,
    computation: (match, previous) => {
      if (match.state === 'ready') {
        return match.result;
      }
      return match.state === 'idle' ? null : (previous?.value ?? null);
    },
  });
}
