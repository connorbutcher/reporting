import { Injectable, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';

/** The URL fragment as a signal. Fragments are router-global, so any route can inject this. */
@Injectable({ providedIn: 'root' })
export class UrlFragmentService {
  public readonly fragment: Signal<string | null>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    this.fragment = toSignal(this.route.fragment, { initialValue: this.route.snapshot.fragment });
  }

  /** Pass `queryParams` to merge them into the same navigation, so the fragment isn't cleared. */
  public navigate(fragment: string, queryParams?: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      fragment,
      ...(queryParams ? { queryParams, queryParamsHandling: 'merge' as const } : {}),
    });
  }
}
