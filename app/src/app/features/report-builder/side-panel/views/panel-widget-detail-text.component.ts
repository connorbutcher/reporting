import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { StaticTextWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

/** The static-text branch of the widget-detail panel: content and a link to its style view. */
@Component({
  selector: 'app-panel-widget-detail-text',
  imports: [FormsModule, TextareaModule, PanelGroupComponent],
  template: `
    <app-panel-group label="Content" icon="▤">
      <label class="panel-field">
        <span class="panel-field-label">Content</span>
        <textarea
          pTextarea
          rows="6"
          [ngModel]="text().content()"
          (ngModelChange)="text().content.set($event)"
          placeholder="Type the text this widget should show…"
        ></textarea>
      </label>
    </app-panel-group>

    <button
      type="button"
      class="panel-menu-item"
      (click)="store.navigate({ kind: 'textStyle', widgetId: text().id })"
    >
      <i class="pi pi-palette" aria-hidden="true"></i>
      <span class="panel-menu-text">
        <span class="panel-menu-label">Style</span>
        <span class="panel-menu-hint">Font, colour, alignment</span>
      </span>
      <i class="pi pi-angle-right" aria-hidden="true"></i>
    </button>
  `,
})
export class PanelWidgetDetailTextComponent {
  protected readonly store = inject(ReportBuilderStore);

  readonly text = input.required<StaticTextWidgetModel>();
}
