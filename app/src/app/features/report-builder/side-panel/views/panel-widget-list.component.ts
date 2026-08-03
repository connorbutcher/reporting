import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { ReportBuilderStore } from '../../report-builder.store';

@Component({
  selector: 'app-panel-widget-list',
  imports: [FormsModule, ButtonModule, ListboxModule],
  template: `
    @if (store.widgets().length === 0) {
      <p class="panel-empty">No widgets yet. Add one to get started.</p>
    } @else {
      <p-listbox
        styleClass="panel-widget-listbox"
        [options]="options()"
        [ngModel]="store.selectedWidgetId()"
        optionLabel="label"
        optionValue="id"
        dataKey="id"
        ariaLabel="Widgets on the canvas"
        (onClick)="open($event.option?.id)"
        (onChange)="open($event.value)"
      >
        <ng-template #item let-widget>
          <span class="panel-widget-item">
            <i class="pi" [class.pi-table]="widget.type === 'dataTable'" [class.pi-align-left]="widget.type === 'staticText'" aria-hidden="true"></i>
            <span class="panel-widget-text">
              <span class="panel-widget-name">{{ widget.label }}</span>
              <span class="panel-widget-meta">
                {{ widget.w }} × {{ widget.h }} at {{ widget.x }}, {{ widget.y }}
              </span>
            </span>
          </span>
        </ng-template>
      </p-listbox>
    }
    <p-button
      label="Add widget"
      icon="pi pi-plus"
      severity="secondary"
      outlined
      fluid
      (onClick)="store.navigate({ kind: 'addWidget' })"
    />
  `,
  styles: `
    .panel-widget-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;

      .pi {
        color: var(--app-navy);
      }
    }

    .panel-widget-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .panel-widget-name {
      font-size: 0.85rem;
      font-weight: 600;
    }

    .panel-widget-meta {
      font-size: 0.72rem;
      color: #64748b;
    }

    :host ::ng-deep .panel-widget-listbox {
      border: 1px solid var(--app-card-border);
      border-radius: 8px;

      .p-listbox-option {
        padding: 8px 10px;
      }

      .p-listbox-option-selected {
        background: var(--p-primary-50, #eef3fa);
        box-shadow: inset 3px 0 0 var(--app-navy);

        .panel-widget-name {
          color: var(--app-navy);
        }
      }
    }
  `,
})
export class PanelWidgetListComponent {
  protected readonly store = inject(ReportBuilderStore);

  /** Listbox needs plain fields, so each model is flattened into an option. */
  protected readonly options = computed(() =>
    this.store.widgets().map((widget) => ({
      id: widget.id,
      type: widget.type,
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
    if (widgetId) this.store.selectWidget(widgetId);
  }
}
