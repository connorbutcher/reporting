import { Component, computed, inject, input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { FilterGroupModel } from '../../../models/filter';
import { ReusableFilter, reusableFiltersFor } from '../../../models/filter-reuse';
import { ReportSession } from '../../../state/report-session';

/**
 * Reuse controls above a filter builder: copy another filter on the same dataset into the
 * one being edited, and (for a widget's own filter) promote it to the report-level filter.
 * Both just re-seed a {@link FilterGroupModel} through `replaceWith`, so an errant copy is a
 * single Undo away. Renders nothing when there's neither a source to copy nor a filter to
 * promote, so a first, only filter shows no chrome.
 */
@Component({
  selector: 'app-panel-filter-reuse',
  imports: [MenuModule],
  templateUrl: './panel-filter-reuse.component.html',
  styleUrl: './panel-filter-reuse.component.scss',
})
export class PanelFilterReuseComponent {
  /** The filter being edited — the copy's destination, and what promote moves up. */
  public readonly target = input.required<FilterGroupModel>();

  /** Its dataset; sources are drawn from the same one. Null (unbound) offers nothing. */
  public readonly datasetId = input.required<number | null>();

  /** Whether "promote to report filter" applies — true for a widget's own filter, not the report's. */
  public readonly canPromote = input(false);

  /** Other same-dataset filters that could be copied in, or empty when there are none. */
  public readonly reusable = computed<ReusableFilter[]>(() => {
    const model = this.session.model();
    const datasetId = this.datasetId();
    if (!model || datasetId === null) return [];
    return reusableFiltersFor(model, datasetId, this.target());
  });

  /** The copy sources as a popup menu — a menu, not a value picker, so it keeps no selection. */
  public readonly copyMenu = computed<MenuItem[]>(() =>
    this.reusable().map((source) => ({ label: source.label, command: () => this.copy(source) })),
  );

  /** Whether there's a filled filter to promote up to the report level. */
  public readonly canPromoteNow = computed(() => this.canPromote() && this.target().count() > 0);

  private readonly session = inject(ReportSession);

  /** Replaces the edited filter's conditions with a copy of the chosen source's. */
  public copy(source: ReusableFilter): void {
    this.target().replaceWith(source.group.toDto());
  }

  /**
   * Moves this widget filter's conditions up to the report-level filter for its dataset,
   * then clears the widget's own — the report filter already layers onto this widget, so
   * keeping both would just AND an identical set. A no-op without a bound dataset.
   */
  public promote(): void {
    const model = this.session.model();
    const datasetId = this.datasetId();
    if (!model || datasetId === null) return;
    model.ensureReportFilter(datasetId).group.replaceWith(this.target().toDto());
    this.target().clear();
  }
}
