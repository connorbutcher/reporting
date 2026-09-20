import { Component, computed, inject, input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { FilterGroupModel } from '../../../models/filter';
import { ReusableFilter, reusableFiltersFor } from '../../../models/filter-reuse';
import { ReportSession } from '../../../state/report-session';

/**
 * Above a filter builder: copy another filter on the same dataset into the one being edited, and
 * (for a widget's own filter) promote it to the report-level filter. Both go through `replaceWith`,
 * so a wrong copy is one Undo away. Renders nothing when there's nothing to copy or promote.
 */
@Component({
  selector: 'app-panel-filter-reuse',
  imports: [MenuModule],
  templateUrl: './panel-filter-reuse.component.html',
  styleUrl: './panel-filter-reuse.component.scss',
})
export class PanelFilterReuseComponent {
  /** The filter being edited: where a copy lands, and what promote moves up. */
  public readonly target = input.required<FilterGroupModel>();

  /** Sources come from the same dataset. Null (unbound) offers nothing. */
  public readonly datasetId = input.required<number | null>();

  /** True for a widget's own filter, not the report's. */
  public readonly canPromote = input(false);

  public readonly reusable = computed<ReusableFilter[]>(() => {
    const model = this.session.model();
    const datasetId = this.datasetId();
    if (!model || datasetId === null) return [];
    return reusableFiltersFor(model, datasetId, this.target());
  });

  public readonly copyMenu = computed<MenuItem[]>(() =>
    this.reusable().map((source) => ({ label: source.label, command: () => this.copy(source) })),
  );

  public readonly canPromoteNow = computed(() => this.canPromote() && this.target().count() > 0);

  private readonly session = inject(ReportSession);

  public copy(source: ReusableFilter): void {
    this.target().replaceWith(source.group.toDto());
  }

  /**
   * Moves this filter's conditions up to the report filter for its dataset and clears its own: the
   * report filter already layers onto this widget, so keeping both would AND an identical set.
   */
  public promote(): void {
    const model = this.session.model();
    const datasetId = this.datasetId();
    if (!model || datasetId === null) return;
    model.ensureReportFilter(datasetId).group.replaceWith(this.target().toDto());
    this.target().clear();
  }
}
