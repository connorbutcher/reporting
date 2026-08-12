import { Component, inject } from '@angular/core';
import { widgetTypesByGroup } from '../../../../core/models/widget-catalog';
import { ReportBuilderStore } from '../../report-builder.store';

@Component({
  selector: 'app-panel-add-widget',
  imports: [],
  template: `
    <div class="panel-section">
      <p class="panel-hint">
        Pick a widget to place on the canvas. You choose its content afterwards.
      </p>
      @for (entry of groups; track entry.group.id) {
        <div class="panel-add-group">
          <span class="panel-add-group-label">{{ entry.group.label }}</span>
          @for (widget of entry.types; track widget.type) {
            <button type="button" class="panel-menu-item" (click)="store.addWidget(widget.type)">
              <i [class]="widget.icon" aria-hidden="true"></i>
              <span class="panel-menu-text">
                <span class="panel-menu-label">{{ widget.label }}</span>
                <span class="panel-menu-hint">{{ widget.hint }}</span>
              </span>
              <i class="pi pi-plus" aria-hidden="true"></i>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .panel-add-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .panel-add-group + .panel-add-group {
      margin-top: 14px;
    }

    .panel-add-group-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      padding: 0 2px;
    }
  `,
})
export class PanelAddWidgetComponent {
  protected readonly store = inject(ReportBuilderStore);

  protected readonly groups = widgetTypesByGroup();
}
