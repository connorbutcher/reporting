import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/** Toasts a 403, and a 404 on a GET (the API masks "no access" as 404). The error still propagates. */
export class HttpErrorNotification {
  private static readonly SKIP = new HttpContextToken<boolean>(() => false);

  public static intercept(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
  ): Observable<HttpEvent<unknown>> {
    const notify = inject(NotificationService);
    return next(req).pipe(
      tap({ error: (error: unknown) => HttpErrorNotification.notify(notify, req, error) }),
    );
  }

  /** Opts a request out, for an expected 404 or a screen with its own message. */
  public static skip(context: HttpContext = new HttpContext()): HttpContext {
    return context.set(HttpErrorNotification.SKIP, true);
  }

  private static notify(
    notify: NotificationService,
    req: HttpRequest<unknown>,
    error: unknown,
  ): void {
    if (req.context.get(HttpErrorNotification.SKIP) || !(error instanceof HttpErrorResponse)) {
      return;
    }
    if (error.status === 403) {
      notify.error("You don't have permission to access this resource.", 'Access denied');
    } else if (error.status === 404 && req.method === 'GET') {
      notify.error(
        "This couldn't be found. It may have been removed, or you don't have access to it.",
        'Not found',
      );
    }
  }
}
