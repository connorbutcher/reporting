import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Set on a request to opt it out of the global access/not-found toast below. Use it where the
 * status is expected control flow (a GET that 404s to signal "nothing here yet") or where the
 * caller already surfaces these statuses with its own, more specific UI.
 */
export const SKIP_HTTP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

/** An {@link HttpContext} (new, or extending an existing one) that opts a request out of the global error toast. */
export function skipHttpErrorNotification(context: HttpContext = new HttpContext()): HttpContext {
  return context.set(SKIP_HTTP_ERROR_NOTIFICATION, true);
}

/**
 * Surfaces the two access failures the API returns as a plain toast, everywhere, so the user always
 * learns why a request didn't go through rather than seeing nothing (or a misleading "try again"):
 *
 * - **403 Forbidden** (any method) — they're signed in but not allowed to touch this resource.
 * - **404 Not Found** on a **GET** — data they tried to view couldn't be retrieved, because it was
 *   removed or is hidden from them (the API masks "no access" as 404 so nothing private leaks).
 *
 * A 404 on a write is left alone — those are usually normal control flow (nothing to discard, an
 * already-gone row) handled at the call site. Requests that carry {@link SKIP_HTTP_ERROR_NOTIFICATION}
 * are ignored here so an expected 404 or a screen with its own tailored message doesn't double up.
 * The error still propagates, so existing inline/empty states keep working.
 */
export const httpErrorNotificationInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        if (req.context.get(SKIP_HTTP_ERROR_NOTIFICATION)) return;
        if (!(error instanceof HttpErrorResponse)) return;

        if (error.status === 403) {
          notify.error("You don't have permission to access this resource.", 'Access denied');
        } else if (error.status === 404 && req.method === 'GET') {
          notify.error(
            "This couldn't be found. It may have been removed, or you don't have access to it.",
            'Not found',
          );
        }
      },
    }),
  );
};
