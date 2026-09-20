import { Component, input, output } from '@angular/core';

/** The clickable summary line of a filter row. */
@Component({
  selector: 'app-filter-row-header',
  template: `
    <button type="button" class="row" [attr.aria-expanded]="open()" (click)="toggle.emit()">
      <i [class]="icon()" aria-hidden="true"></i>
      <span class="text">
        <span class="label">{{ label() }}</span>
        <span class="summary">
          {{ summary() }}
          @if (changed()) {
            <span class="changed">· changed</span>
          }
        </span>
      </span>
      <i class="pi" [class.pi-angle-down]="open()" [class.pi-angle-right]="!open()"></i>
    </button>
  `,
  styleUrl: './filter-row-header.component.scss',
})
export class FilterRowHeaderComponent {
  public readonly icon = input.required<string>();
  public readonly label = input.required<string>();
  public readonly summary = input.required<string>();
  public readonly changed = input(false);
  public readonly open = input(false);
  public readonly toggle = output<void>();
}
