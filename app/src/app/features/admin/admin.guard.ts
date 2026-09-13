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

/** The admin area is open to anyone who manages users or groups; others go home. */
export const adminAreaGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUserService);
  return decide(() => currentUser.canManageUsers() || currentUser.canManageGroups(), '/');
};

/** The Users section needs the manage-users permission; someone who only manages groups is sent there. */
export const fullAdminGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUserService);
  return decide(() => currentUser.canManageUsers(), '/admin/groups');
};

/** The Groups section needs to manage at least one group; someone who only manages users is sent there. */
export const groupManagerGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUserService);
  return decide(() => currentUser.canManageGroups(), '/admin/users');
};
