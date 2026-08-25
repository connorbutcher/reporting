import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportSession } from '../../state/report-session';
import { TabCommands } from '../../state/tab-commands';

/**
 * The tab strip along the top of the canvas. Each tab is its own grid surface;
 * clicking one switches the canvas to it, double-clicking renames it inline, and
 * the trailing button adds another. The last remaining tab can't be deleted — a
 * revision always needs at least one surface.
 */
@Component({
  selector: 'app-canvas-tabs',
  imports: [FormsModule],
  template: `
    <div class="tabs" role="tablist">
      @for (tab of tabs(); track tab.id) {
        <div
          class="tab"
          role="tab"
          [class.active]="tab.id === activeTabId()"
          [attr.aria-selected]="tab.id === activeTabId()"
          (click)="select(tab.id)"
        >
          @if (editingId() === tab.id) {
            <input
              class="tab-rename"
              type="text"
              [ngModel]="tab.name()"
              (ngModelChange)="draft.set($event)"
              (blur)="commitRename(tab.id)"
              (keydown.enter)="commitRename(tab.id)"
              (keydown.escape)="cancelRename()"
              (click)="$event.stopPropagation()"
              (focus)="selectAll($event)"
              autofocus
            />
          } @else {
            <span class="tab-label" (dblclick)="startRename(tab.id)">{{ tab.name() }}</span>
            @if (canDelete()) {
              <button
                type="button"
                class="tab-close"
                aria-label="Delete tab"
                title="Delete tab"
                (click)="remove(tab.id, $event)"
              >
                <i class="pi pi-times" aria-hidden="true"></i>
              </button>
            }
          }
        </div>
      }

      <button type="button" class="tab-add" aria-label="Add tab" title="Add tab" (click)="add()">
        <i class="pi pi-plus" aria-hidden="true"></i>
      </button>
    </div>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        align-items: stretch;
        gap: 2px;
        height: 34px;
        padding: 0 8px;
        border-bottom: 1px solid var(--app-card-border);
        background: #fbfcfe;
        overflow-x: auto;
      }
      .tab {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0 10px;
        max-width: 200px;
        border: 1px solid transparent;
        border-bottom: none;
        border-radius: 6px 6px 0 0;
        font-size: 0.78rem;
        color: #64748b;
        cursor: pointer;
        white-space: nowrap;
        align-self: flex-end;
        height: 28px;
      }
      .tab:hover {
        background: #f1f5f9;
      }
      .tab.active {
        background: #fff;
        border-color: var(--app-card-border);
        color: #152a55;
        font-weight: 600;
      }
      .tab-label {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tab-rename {
        width: 120px;
        font: inherit;
        border: 1px solid var(--app-card-border);
        border-radius: 4px;
        padding: 1px 4px;
      }
      .tab-close,
      .tab-add {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        border-radius: 4px;
        padding: 2px;
        font-size: 0.7rem;
      }
      .tab-close:hover {
        color: #ef4444;
        background: #fee2e2;
      }
      .tab-add {
        align-self: flex-end;
        height: 28px;
        width: 28px;
        color: #64748b;
      }
      .tab-add:hover {
        background: #f1f5f9;
      }
    `,
  ],
})
export class CanvasTabsComponent {
  private readonly session = inject(ReportSession);
  private readonly tabCommands = inject(TabCommands);

  protected readonly tabs = this.session.tabs;
  protected readonly activeTabId = this.session.activeTabId;
  protected readonly canDelete = computed(() => this.tabs().length > 1);

  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal('');

  protected select(tabId: string): void {
    this.tabCommands.selectTab(tabId);
  }

  protected add(): void {
    this.tabCommands.addTab();
  }

  protected remove(tabId: string, event: Event): void {
    event.stopPropagation();
    this.tabCommands.removeTab(tabId);
  }

  protected startRename(tabId: string): void {
    this.draft.set(this.tabs().find((t) => t.id === tabId)?.name() ?? '');
    this.editingId.set(tabId);
  }

  protected commitRename(tabId: string): void {
    if (this.editingId() !== tabId) return;
    const name = this.draft().trim();
    if (name) this.tabCommands.renameTab(tabId, name);
    this.editingId.set(null);
  }

  protected cancelRename(): void {
    this.editingId.set(null);
  }

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }
}
