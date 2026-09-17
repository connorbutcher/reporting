import { Injectable, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';

/**
 * The URL's fragment (the part after `#`), as a reactive signal, plus a way to
 * navigate to one. Fragments are global to the router, like query params — any
 * `ActivatedRoute` in the tree sees the same value, so this works regardless of
 * which route injects it.
 */
@Injectable({ providedIn: 'root' })
export class UrlFragmentService {
  public readonly fragment: Signal<string | null>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    this.fragment = toSignal(this.route.fragment, { initialValue: this.route.snapshot.fragment });
  }

  /**
   * Navigates to a fragment, so a link naming it can be shared and reopened.
   * Pass `queryParams` to merge in the same navigation (e.g. switching tab to
   * the one that owns the target), rather than as a separate one that could
   * momentarily clear the fragment.
   */
  public navigate(fragment: string, queryParams?: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      fragment,
      ...(queryParams ? { queryParams, queryParamsHandling: 'merge' as const } : {}),
    });
  }
}
