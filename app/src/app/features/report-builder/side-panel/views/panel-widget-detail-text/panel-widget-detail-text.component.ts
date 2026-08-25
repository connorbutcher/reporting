import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { StaticTextWidgetModel } from '../../../models/widget.model';
import { PanelNavigation } from '../../../state/panel-navigation';
import { PanelView } from '../../panel-view';
import { PanelGroupComponent } from '../../panel-group.component';

/** The static-text branch of the widget-detail panel: content and a link to its style view. */
@Component({
  selector: 'app-panel-widget-detail-text',
  imports: [FormsModule, TextareaModule, PanelGroupComponent],
  templateUrl: './panel-widget-detail-text.component.html',
})
export class PanelWidgetDetailTextComponent {
  private readonly navigation = inject(PanelNavigation);

  readonly text = input.required<StaticTextWidgetModel>();

  protected navigate(view: PanelView): void {
    this.navigation.navigate(view);
  }
}
