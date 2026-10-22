import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router, UrlTree } from '@angular/router';
import { Observable, filter, map, take } from 'rxjs';
import { CurrentUserService } from '../../core/services/current-user.service';

/** Route guards for the admin area. They mirror the server's checks, so users don't see a shell they can't use. */
export class AdminGuards {
  /** Open to anyone who manages users or groups; others go home. */
  public static adminArea(): Observable<boolean | UrlTree> {
    const currentUser = inject(CurrentUserService);
    return AdminGuards.decide(
      () => currentUser.canManageUsers() || currentUser.canManageGroups(),
      '/',
    );
  }

  /** Users needs the manage-users permission; someone who only manages groups is sent there. */
  public static fullAdmin(): Observable<boolean | UrlTree> {
    const currentUser = inject(CurrentUserService);
    return AdminGuards.decide(() => currentUser.canManageUsers(), '/admin/groups');
  }

  /** Groups needs at least one managed group; someone who only manages users is sent there. */
  public static groupManager(): Observable<boolean | UrlTree> {
    const currentUser = inject(CurrentUserService);
    return AdminGuards.decide(() => currentUser.canManageGroups(), '/admin/users');
  }

  /** Waits for `/api/me` to settle, so a first navigation isn't decided on the empty initial value. */
  private static decide(allowed: () => boolean, fallback: string): Observable<boolean | UrlTree> {
    const currentUser = inject(CurrentUserService);
    const router = inject(Router);
    return toObservable(currentUser.loaded).pipe(
      filter((loaded) => loaded),
      take(1),
      map(() => (allowed() ? true : router.parseUrl(fallback))),
    );
  }
}
