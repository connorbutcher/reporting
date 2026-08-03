import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ReportBuilderStore } from '../../report-builder.store';

@Component({
  selector: 'app-panel-add-column',
  imports: [FormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="panel-section">
      @if (table(); as table) {
        @if (table.availableColumns().length === 0) {
          <p class="panel-empty">Every dataset column is already on the table.</p>
        } @else {
          <input
            pInputText
            type="search"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            placeholder="Search columns…"
            aria-label="Search dataset columns"
          />

          <p-button
            [label]="addAllLabel()"
            icon="pi pi-plus"
            severity="secondary"
            outlined
            fluid
            [disabled]="matches().length === 0"
            (onClick)="addAll()"
          />

          @if (matches().length === 0) {
            <p class="panel-empty">No columns match “{{ search() }}”.</p>
          } @else {
            @for (column of matches(); track column.id) {
              <button type="button" class="panel-menu-item" (click)="add(column.id)">
                <i class="pi pi-plus" aria-hidden="true"></i>
                <span class="panel-menu-text">
                  <span class="panel-menu-label">{{ column.name }}</span>
                  <span class="panel-menu-hint">{{ column.type }}</span>
                </span>
              </button>
            }
          }
        }
      }
    </div>
  `,
})
export class PanelAddColumnComponent {
  private readonly store = inject(ReportBuilderStore);
  protected readonly table = this.store.selectedTableWidget;

  protected readonly search = signal('');

  /** Columns still available, narrowed by the search box. */
  protected readonly matches = computed(() => {
    const available = this.table()?.availableColumns() ?? [];
    const term = this.search().trim().toLowerCase();
    if (!term) return available;
    return available.filter((column) => column.name.toLowerCase().includes(term));
  });

  protected readonly addAllLabel = computed(() => {
    const count = this.matches().length;
    return this.search().trim() ? `Add ${count} matching` : `Add all ${count}`;
  });

  protected add(columnId: string): void {
    this.table()?.addColumn(columnId);
    // Straight back to the list so several columns can be added in a row.
    this.store.back();
  }

  protected addAll(): void {
    this.table()?.addColumns(this.matches().map((column) => column.id));
    this.store.back();
  }
}
