import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { widgetTypeDescriptor } from '../../../../../core/models/widget-catalog';
import { ReportSession } from '../../../state/report-session';
import { WidgetSelection } from '../../../state/widget-selection';
import { PanelNavigation } from '../../../state/panel-navigation';
import { WidgetFilterSummary } from '../../../models/widget-filter-summary';
import { PanelView } from '../../panel-view';

@Component({
  selector: 'app-panel-widget-list',
  imports: [FormsModule, ButtonModule, ListboxModule],
  templateUrl: './panel-widget-list.component.html',
  styleUrl: './panel-widget-list.component.scss',
})
export class PanelWidgetListComponent {
  public static readonly title = 'Widgets';

  /** Flattened for the listbox, with the widget type as the secondary line. */
  public readonly options = computed(() =>
    this.session.widgets().map((widget) => ({
      id: widget.id,
      type: widget.type,
      icon: widgetTypeDescriptor(widget.type).icon,
      typeLabel: widgetTypeDescriptor(widget.type).label,
      label: widget.label(),
      filterCount: WidgetFilterSummary.count(widget),
    })),
  );

  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly navigation = inject(PanelNavigation);

  /**
   * Clicking the active option toggles it off, so onChange reports null; onClick still names the
   * clicked option, and onChange covers keyboard selection.
   */
  public open(widgetId: string | null | undefined): void {
    if (widgetId) {
      this.navigation.selectWidget(widgetId);
    }
  }

  public navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }

  public get widgets() {
    return this.session.widgets;
  }

  public get selectedWidgetId() {
    return this.selection.selectedWidgetId;
  }
}
