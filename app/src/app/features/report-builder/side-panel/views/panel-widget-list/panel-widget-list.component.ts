import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { widgetTypeDescriptor } from '../../../../../core/models/widget-catalog';
import { ReportSession } from '../../../state/report-session';
import { WidgetSelection } from '../../../state/widget-selection';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';

@Component({
  selector: 'app-panel-widget-list',
  imports: [FormsModule, ButtonModule, ListboxModule],
  templateUrl: './panel-widget-list.component.html',
  styleUrl: './panel-widget-list.component.scss',
})
export class PanelWidgetListComponent {
  static readonly title = 'Widgets';

  private readonly session = inject(ReportSession);
  private readonly selection = inject(WidgetSelection);
  private readonly navigation = inject(PanelNavigation);

  protected readonly widgets = this.session.widgets;
  protected readonly selectedWidgetId = this.selection.selectedWidgetId;

  /** Listbox needs plain fields, so each model is flattened into an option. */
  protected readonly options = computed(() =>
    this.session.widgets().map((widget) => ({
      id: widget.id,
      type: widget.type,
      icon: widgetTypeDescriptor(widget.type).icon,
      label: widget.label(),
      x: widget.x(),
      y: widget.y(),
      w: widget.w(),
      h: widget.h(),
    })),
  );

  /**
   * Clicking the already-active option makes the listbox toggle it off, so
   * onChange reports null. onClick still names the clicked option, which keeps
   * opening a single click; onChange covers keyboard selection.
   */
  protected open(widgetId: string | null | undefined): void {
    if (widgetId) this.navigation.selectWidget(widgetId);
  }

  protected navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
