import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ChartToleranceBand } from '../../../../core/models/report.model';
import { ChartWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

/** The "Tolerance bands" group of the chart detail panel: lists each band and adds new ones. */
@Component({
  selector: 'app-panel-chart-tolerance-list',
  imports: [ButtonModule, PanelGroupComponent],
  template: `
    <app-panel-group label="Tolerance bands" icon="⛁">
      <p class="panel-hint">Dashed reference lines resolved from a separate limits dataset.</p>
      @if (chart().toleranceBands().length === 0) {
        <p class="panel-empty">No reference lines yet.</p>
      } @else {
        @for (band of chart().toleranceBands(); track band.id) {
          <button
            type="button"
            class="panel-menu-item"
            (click)="
              store.navigate({ kind: 'chartToleranceBand', widgetId: chart().id, bandId: band.id })
            "
          >
            <i class="pi pi-minus" aria-hidden="true"></i>
            <span class="panel-menu-text">
              <span class="panel-menu-label">{{ band.axis === 'x' ? 'X axis' : 'Y axis' }}</span>
              <span class="panel-menu-hint">{{ bandSummary(band) }}</span>
            </span>
            <i class="pi pi-angle-right" aria-hidden="true"></i>
          </button>
        }
      }
      <p-button
        label="Add band"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        fluid
        (onClick)="addToleranceBand()"
      />
    </app-panel-group>
  `,
})
export class PanelChartToleranceListComponent {
  protected readonly store = inject(ReportBuilderStore);

  readonly chart = input.required<ChartWidgetModel>();

  /** Adds a band and jumps straight to it, rather than leaving the user to find it in the list. */
  protected addToleranceBand(): void {
    const chart = this.chart();
    const bandId = chart.addToleranceBand();
    this.store.navigate({ kind: 'chartToleranceBand', widgetId: chart.id, bandId });
  }

  protected bandSummary(band: ChartToleranceBand): string {
    if (!band.sourceDatasetId) return 'Not set up yet';
    return this.store.datasets().find((d) => d.id === band.sourceDatasetId)?.name ?? 'Dataset';
  }
}
