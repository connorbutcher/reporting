import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { WidgetType } from '../../../../../core/models/report.model';
import { widgetTypeDescriptor } from '../../../../../core/models/widget-catalog';
import { ChartWidgetModel, StaticTextWidgetModel } from '../../../models/widget.model';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelWidgetDetailChartComponent } from '../panel-widget-detail-chart/panel-widget-detail-chart.component';
import { PanelWidgetDetailTableComponent } from '../panel-widget-detail-table/panel-widget-detail-table.component';
import { PanelWidgetDetailTextComponent } from '../panel-widget-detail-text/panel-widget-detail-text.component';

@Component({
  selector: 'app-panel-widget-detail',
  imports: [
    FormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    PanelWidgetDetailTableComponent,
    PanelWidgetDetailChartComponent,
    PanelWidgetDetailTextComponent,
  ],
  templateUrl: './panel-widget-detail.component.html',
  styleUrl: './panel-widget-detail.component.scss',
})
export class PanelWidgetDetailComponent {
  /** Fallback heading; the chrome shows the selected widget's own name when there is one. */
  static readonly title = 'Widget';

  private readonly store = inject(ReportBuilderStore);

  protected readonly hasMultiSelection = this.store.hasMultiSelection;
  protected readonly selectedWidgetIds = this.store.selectedWidgetIds;
  protected readonly selectedWidget = this.store.selectedWidget;
  protected readonly widgets = this.store.widgets;

  protected readonly table = this.store.selectedTableWidget;
  protected readonly text = computed(() => {
    const widget = this.store.selectedWidget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });
  protected readonly chart = computed(() => {
    const widget = this.store.selectedWidget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  protected readonly index = computed(() =>
    this.store.widgets().findIndex((w) => w.id === this.store.selectedWidgetId()),
  );
  protected readonly hasPrevious = computed(() => this.index() > 0);
  protected readonly hasNext = computed(
    () => this.index() >= 0 && this.index() < this.store.widgets().length - 1,
  );

  protected defaultTitle(type: WidgetType): string {
    return widgetTypeDescriptor(type).label;
  }

  protected duplicateSelection(): void {
    this.store.duplicateSelection();
  }

  protected removeSelection(): void {
    this.store.removeWidgets(this.store.selectedWidgetIds());
  }

  protected removeWidget(widgetId: string): void {
    this.store.removeWidget(widgetId);
  }

  protected stepWidget(offset: number): void {
    this.store.stepWidget(offset);
  }
}
