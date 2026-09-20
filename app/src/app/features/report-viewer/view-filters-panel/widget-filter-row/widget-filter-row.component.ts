import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { FilterBuilderComponent } from '../../../report-builder/side-panel/filter-builder/filter-builder.component';
import { ReportViewFilters } from '../../filters/report-view-filters';
import { ViewWidgetFilters } from '../../filters/view-widget-filters';
import { FilterRowHeaderComponent } from '../filter-row-header/filter-row-header.component';

/** A widget's filter. A chart overlaying several datasets gets a picker for which one to edit. */
@Component({
  selector: 'app-widget-filter-row',
  imports: [FormsModule, SelectModule, FilterRowHeaderComponent, FilterBuilderComponent],
  template: `
    <app-filter-row-header
      [icon]="item().widget.icon"
      [label]="item().widget.title"
      [summary]="item().summary()"
      [changed]="item().changed()"
      [open]="open()"
      (toggle)="toggle.emit()"
    />
    @if (open()) {
      <div class="builder">
        @if (item().entries.length > 1) {
          <div class="source-picker panel-field">
            <label class="panel-field-label" [for]="pickerId()">Dataset</label>
            <p-select
              size="small"
              appendTo="body"
              [inputId]="pickerId()"
              [options]="item().options()"
              optionLabel="label"
              optionValue="key"
              [ngModel]="entry().key"
              (onChange)="pick($event.value)"
            />
          </div>
        }
        <app-filter-builder [group]="entry().group" [additionalFilter]="filters().pageFilterFor(entry())" />
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
    }

    .builder {
      padding: 8px 4px 4px;
    }

    .source-picker {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--app-card-border);
    }
  `,
})
export class WidgetFilterRowComponent {
  public readonly item = input.required<ViewWidgetFilters>();
  public readonly filters = input.required<ReportViewFilters>();
  public readonly open = input(false);
  public readonly toggle = output<void>();

  /** The filter being edited: the picked dataset's, else the first. */
  public readonly entry = computed(
    () => this.item().entries.find((e) => e.key === this.picked()) ?? this.item().entries[0],
  );

  public readonly pickerId = computed(() => `source-${this.item().widget.id}`);

  /** Kept while the row is closed. */
  private readonly picked = signal<string | null>(null);

  public pick(entryKey: string): void {
    this.picked.set(entryKey);
  }
}
