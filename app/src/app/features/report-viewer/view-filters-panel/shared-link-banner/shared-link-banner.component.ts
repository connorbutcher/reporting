import { Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SharedLinkState } from '../../filters/shared-link-state';
import { Plural } from '../../../../shared/text/plural';

/** Says the filters on screen came from a shared link, and offers the two ways out. */
@Component({
  selector: 'app-shared-link-banner',
  imports: [ButtonModule],
  template: `
    <p class="message">
      <i class="pi pi-link" aria-hidden="true"></i>
      Showing filters from a shared link.
      @if (unmatchedText(); as text) {
        <span class="warning">{{ text }}</span>
      }
      @if (missingText(); as text) {
        <span class="warning">{{ text }}</span>
      }
    </p>
    <div class="actions">
      <p-button label="Save as mine" size="small" (onClick)="save.emit()" />
      <p-button
        label="Back to mine"
        size="small"
        severity="secondary"
        outlined
        (onClick)="discard.emit()"
      />
    </div>
  `,
  host: { role: 'status' },
  styleUrl: './shared-link-banner.component.scss',
})
export class SharedLinkBannerComponent {
  public readonly link = input.required<SharedLinkState>();
  public readonly save = output<void>();
  public readonly discard = output<void>();

  public readonly unmatchedText = computed(() => {
    const { unmatched, total } = this.link();
    if (unmatched === 0) {
      return '';
    }
    return `${unmatched} of ${total} ${Plural.of(total, 'filter', 'filters')} in it ${Plural.of(unmatched, "doesn't", "don't")} apply to this version and ${Plural.of(unmatched, 'was', 'were')} left out.`;
  });

  public readonly missingText = computed(() => {
    const n = this.link().missingColumns;
    if (n === 0) {
      return '';
    }
    return `${n} ${Plural.of(n, 'condition in it tests a column', 'conditions in it test columns')} that no longer ${Plural.of(n, 'exists', 'exist')}, so ${Plural.of(n, 'it was', 'they were')} left out.`;
  });
}
