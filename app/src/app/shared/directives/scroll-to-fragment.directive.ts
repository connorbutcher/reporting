import { Directive, ElementRef, effect, inject, input, signal } from '@angular/core';
import { UrlFragmentService } from '../../core/services/url-fragment.service';

@Directive({
  selector: '[appScrollToFragment]',
  host: {
    '[class.fragment-target]': 'highlighted()',
  },
})
export class ScrollToFragmentDirective {
  /** The fragment this element answers to. */
  public readonly appScrollToFragment = input.required<string>();

  public readonly highlighted = signal(false);

  private readonly fragments = inject(UrlFragmentService);

  private readonly element = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      if (this.fragments.fragment() !== this.appScrollToFragment()) {
        return;
      }
      this.element.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlighted.set(true);
      setTimeout(() => this.highlighted.set(false), 1600);
    });
  }
}
