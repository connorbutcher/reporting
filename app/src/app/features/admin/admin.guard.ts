import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanMatchFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { CurrentUserService } from '../../core/services/current-user.service';

/**
 * Waits for `/api/me` to settle (so a first navigation isn't decided on the empty initial value),
 * then allows the route or redirects to `fallback`. Mirrors the server-side guards — this just
 * avoids showing a shell the user can't use.
 */
function decide(allowed: () => boolean, fallback: string) {
  const currentUser = inject(CurrentUserService);
  const router = inject(Router);
  return toObservable(currentUser.loaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => (allowed() ? true : router.parseUrl(fallback))),
  );
}

/** The admin area is open to full admins and to delegated group managers; others go home. */
export const adminAreaGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUserService);
  return decide(() => currentUser.canManageUsers() || currentUser.canManageGroups(), '/');
};

/** The Users section is full-admin-only; a delegated manager is sent to the Groups section. */
export const fullAdminGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUserService);
  return decide(() => currentUser.canManageUsers(), '/admin/groups');
};
