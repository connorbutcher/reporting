import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { WidgetType } from '../../../../../core/models/report';
import { WidgetCatalog } from '../../../../../core/models/widget-catalog/widget-catalog';
import {
  ChartWidgetModel,
  KpiWidgetModel,
  PivotTableWidgetModel,
  StaticTextWidgetModel,
} from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { WidgetSelection } from '../../../state/widget-selection';
import { WidgetCommands } from '../../../state/widget-commands';
import { PanelWidgetDetailChartComponent } from '../panel-widget-detail-chart/panel-widget-detail-chart.component';
import { PanelWidgetDetailKpiComponent } from '../panel-widget-detail-kpi/panel-widget-detail-kpi.component';
import { PanelWidgetDetailPivotComponent } from '../panel-widget-detail-pivot/panel-widget-detail-pivot.component';
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
    PanelWidgetDetailPivotComponent,
    PanelWidgetDetailKpiComponent,
    PanelWidgetDetailChartComponent,
    PanelWidgetDetailTextComponent,
  ],
  templateUrl: './panel-widget-detail.component.html',
  styleUrl: './panel-widget-detail.component.scss',
})
export class PanelWidgetDetailComponent {
  /** Fallback heading; the chrome shows the widget's own name when there is one. */
  public static readonly title = 'Widget';

  public readonly pivot = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof PivotTableWidgetModel ? widget : null;
  });

  public readonly kpi = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof KpiWidgetModel ? widget : null;
  });

  public readonly text = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });

  public readonly chart = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  public readonly index = computed(() =>
    this.session.widgets().findIndex((w) => w.id === this.selection.selectedWidgetId()),
  );

  public readonly hasPrevious = computed(() => this.index() > 0);

  public readonly hasNext = computed(
    () => this.index() >= 0 && this.index() < this.session.widgets().length - 1,
  );

  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly commands = inject(WidgetCommands);

  public defaultTitle(type: WidgetType): string {
    return WidgetCatalog.descriptor(type).label;
  }

  public duplicateSelection(): void {
    this.commands.duplicateSelection();
  }

  public removeSelection(): void {
    this.commands.removeWidgets(this.selection.selectedWidgetIds());
  }

  public removeWidget(widgetId: string): void {
    this.commands.removeWidget(widgetId);
  }

  public stepWidget(offset: number): void {
    this.commands.stepWidget(offset);
  }

  public get hasMultiSelection() {
    return this.selection.hasMultiSelection;
  }

  public get selectedWidgetIds() {
    return this.selection.selectedWidgetIds;
  }

  public get selectedWidget() {
    return this.session.selectedWidget;
  }

  public get widgets() {
    return this.session.widgets;
  }

  public get table() {
    return this.session.selectedTableWidget;
  }
}
