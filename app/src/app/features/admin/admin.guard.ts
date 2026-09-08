import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanMatchFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { CurrentUserService } from '../../core/services/current-user.service';

/**
 * Keeps the admin area to users who can manage the directory. Waits for `/api/me` to settle (so a
 * first navigation isn't decided on the empty initial value), then allows through or redirects
 * home. Mirrors the server-side guard — the API returns 403 regardless, this just avoids showing a
 * shell the user can't use.
 */
export const canManageUsersGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUserService);
  const router = inject(Router);

  return toObservable(currentUser.loaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => (currentUser.canManageUsers() ? true : router.parseUrl('/'))),
  );
};
