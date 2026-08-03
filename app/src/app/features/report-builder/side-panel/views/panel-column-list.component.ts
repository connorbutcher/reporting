import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ReportBuilderStore } from '../../report-builder.store';

@Component({
  selector: 'app-panel-column-list',
  imports: [ButtonModule],
  template: `
    @if (table(); as table) {
      @if (table.columns().length === 0) {
        <p class="panel-empty">No columns on this table yet.</p>
      } @else {
        <p class="panel-hint">Reorder with the arrows, or open a column to rename and format it.</p>
        <ul class="panel-columns">
          @for (column of table.columns(); track column.columnId; let i = $index) {
            <li class="panel-column-row">
              <button type="button" class="panel-column-open" (click)="openSettings(column.columnId)">
                <span class="panel-column-name">{{ column.label() }}</span>
                <span class="panel-column-type">{{ column.schemaColumn()?.type ?? 'missing' }}</span>
              </button>
              <p-button
                icon="pi pi-chevron-up"
                severity="secondary"
                text
                size="small"
                [ariaLabel]="'Move ' + column.label() + ' up'"
                [disabled]="i === 0"
                (onClick)="table.moveColumn(i, -1)"
              />
              <p-button
                icon="pi pi-chevron-down"
                severity="secondary"
                text
                size="small"
                [ariaLabel]="'Move ' + column.label() + ' down'"
                [disabled]="i === table.columns().length - 1"
                (onClick)="table.moveColumn(i, 1)"
              />
              <p-button
                icon="pi pi-times"
                severity="danger"
                text
                size="small"
                [ariaLabel]="'Remove ' + column.label()"
                (onClick)="table.removeColumn(column.columnId)"
              />
            </li>
          }
        </ul>
      }

      <p-button
        label="Add column"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        fluid
        [disabled]="table.availableColumns().length === 0"
        (onClick)="openAdd()"
      />
      @if (table.availableColumns().length === 0 && table.columns().length > 0) {
        <p class="panel-hint">Every dataset column is already on the table.</p>
      }
    }
  `,
  styles: `
    .panel-columns {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .panel-column-row {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px 4px 2px 8px;
      border: 1px solid var(--app-card-border);
      border-radius: 8px;
      background: #fff;
    }

    .panel-column-open {
      display: flex;
      flex-direction: column;
      gap: 1px;
      flex: 1;
      min-width: 0;
      padding: 6px 0;
      border: 0;
      background: none;
      font: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    .panel-column-name {
      font-size: 0.82rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .panel-column-type {
      font-size: 0.68rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `,
})
export class PanelColumnListComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly table = this.store.selectedTableWidget;
  protected readonly widgetId = computed(() => this.table()?.id ?? null);

  protected openSettings(columnId: string): void {
    const widgetId = this.widgetId();
    if (widgetId) this.store.navigate({ kind: 'columnSettings', widgetId, columnId });
  }

  protected openAdd(): void {
    const widgetId = this.widgetId();
    if (widgetId) this.store.navigate({ kind: 'addColumn', widgetId });
  }
}
