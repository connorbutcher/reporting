import { httpResource } from '@angular/common/http';
import { Service, computed } from '@angular/core';
import { CurrentUser } from '../models/admin';

/**
 * The signed-in user's own identity and app permissions, loaded once from `/api/me`. Used to show
 * admin navigation and guard the admin route. App-wide (root, the `@Service` default), so the
 * fetch is shared and cached across the header and the guard rather than repeated.
 */
@Service()
export class CurrentUserService {
  /** The loaded user, or null until it arrives (or if it failed to load). */
  public readonly user = computed<CurrentUser | null>(() =>
    this.resource.hasValue() ? (this.resource.value() ?? null) : null,
  );

  public readonly canManageUsers = computed(() => this.user()?.canManageUsers ?? false);
  public readonly isGlobalAdmin = computed(() => this.user()?.isGlobalAdmin ?? false);

  /** True once the fetch has settled (value or error), so a guard can wait before deciding. */
  public readonly loaded = computed(() => !this.resource.isLoading());

  private readonly resource = httpResource<CurrentUser | undefined>(() => '/api/me', {
    defaultValue: undefined,
  });

  public reload(): void {
    this.resource.reload();
  }
}
