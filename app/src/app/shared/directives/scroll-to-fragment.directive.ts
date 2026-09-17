import { Directive, ElementRef, effect, inject, input, signal } from '@angular/core';
import { UrlFragmentService } from '../../core/services/url-fragment.service';

/**
 * Scrolls its host into view and briefly highlights it when the URL fragment
 * names it, so a shared link (e.g. `#widget-<id>`) jumps straight to the
 * element — on the builder canvas or in the read-only viewer alike.
 */
@Directive({
  selector: '[appScrollToFragment]',
  host: {
    '[class.fragment-target]': 'highlighted()',
  },
})
export class ScrollToFragmentDirective {
  /** The fragment this element answers to. */
  public readonly appScrollToFragment = input.required<string>();

  private readonly fragments = inject(UrlFragmentService);
  private readonly element = inject(ElementRef<HTMLElement>);

  public readonly highlighted = signal(false);

  constructor() {
    effect(() => {
      if (this.fragments.fragment() !== this.appScrollToFragment()) return;
      this.element.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlighted.set(true);
      setTimeout(() => this.highlighted.set(false), 1600);
    });
  }
}
