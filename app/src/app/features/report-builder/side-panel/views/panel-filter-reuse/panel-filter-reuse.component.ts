import { Component, computed, inject, input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { FilterGroupModel } from '../../../models/filter';
import { ReusableFilters } from '../../../models/reusable-filters';
import { ReusableFilter } from '../../../models/reusable-filter';
import { ReportSession } from '../../../state/report-session';

/**
 * Copies another filter on the same dataset into this one, or promotes a widget's filter to the
 * report filter. Both are one Undo away. Renders nothing when there's nothing to offer.
 */
@Component({
  selector: 'app-panel-filter-reuse',
  imports: [MenuModule],
  templateUrl: './panel-filter-reuse.component.html',
  styleUrl: './panel-filter-reuse.component.scss',
})
export class PanelFilterReuseComponent {
  public readonly target = input.required<FilterGroupModel>();

  /** Null offers nothing. */
  public readonly datasetId = input.required<number | null>();

  /** True for a widget's own filter. */
  public readonly canPromote = input(false);

  public readonly reusable = computed<ReusableFilter[]>(() => {
    const model = this.session.model();
    const datasetId = this.datasetId();
    if (!model || datasetId === null) {
      return [];
    }
    return ReusableFilters.find(model, datasetId, this.target());
  });

  public readonly copyMenu = computed<MenuItem[]>(() =>
    this.reusable().map((source) => ({ label: source.label, command: () => this.copy(source) })),
  );

  public readonly canPromoteNow = computed(() => this.canPromote() && this.target().count() > 0);

  private readonly session = inject(ReportSession);

  public copy(source: ReusableFilter): void {
    this.target().replaceWith(source.group.toDto());
  }

  /** Moves the conditions to the report filter and clears this one, so they aren't ANDed twice. */
  public promote(): void {
    const model = this.session.model();
    const datasetId = this.datasetId();
    if (!model || datasetId === null) {
      return;
    }
    model.ensureReportFilter(datasetId).group.replaceWith(this.target().toDto());
    this.target().clear();
  }
}
