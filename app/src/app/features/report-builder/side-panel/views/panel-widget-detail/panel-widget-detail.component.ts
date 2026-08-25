import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { WidgetType } from '../../../../../core/models/report';
import { widgetTypeDescriptor } from '../../../../../core/models/widget-catalog';
import { ChartWidgetModel, StaticTextWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { WidgetSelection } from '../../../state/widget-selection';
import { WidgetCommands } from '../../../state/widget-commands';
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

  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly commands = inject(WidgetCommands);

  protected readonly hasMultiSelection = this.selection.hasMultiSelection;
  protected readonly selectedWidgetIds = this.selection.selectedWidgetIds;
  protected readonly selectedWidget = this.session.selectedWidget;
  protected readonly widgets = this.session.widgets;

  protected readonly table = this.session.selectedTableWidget;
  protected readonly text = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });
  protected readonly chart = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof ChartWidgetModel ? widget : null;
  });

  protected readonly index = computed(() =>
    this.session.widgets().findIndex((w) => w.id === this.selection.selectedWidgetId()),
  );
  protected readonly hasPrevious = computed(() => this.index() > 0);
  protected readonly hasNext = computed(
    () => this.index() >= 0 && this.index() < this.session.widgets().length - 1,
  );

  protected defaultTitle(type: WidgetType): string {
    return widgetTypeDescriptor(type).label;
  }

  protected duplicateSelection(): void {
    this.commands.duplicateSelection();
  }

  protected removeSelection(): void {
    this.commands.removeWidgets(this.selection.selectedWidgetIds());
  }

  protected removeWidget(widgetId: string): void {
    this.commands.removeWidget(widgetId);
  }

  protected stepWidget(offset: number): void {
    this.commands.stepWidget(offset);
  }
}
