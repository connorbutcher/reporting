import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { skipHttpErrorNotification } from '../http/http-error-notification.interceptor';
import { AccessGrant, RemoveGrant, SaveGrant, SecurableKind, SetInheritance } from '../models/permission';

/**
 * The `/permissions` API for folders and reports — the mutations only. The reads
 * ({@link PermissionsDialogStore}'s permissions/users/groups) go through `httpResource`
 * straight to the URLs {@link base} builds, so they refetch declaratively; PUT/DELETE stay
 * here since a resource can only GET.
 */
@Service()
export class PermissionsApiService {
  private readonly http = inject(HttpClient);

  public setInheritance(kind: SecurableKind, id: number, dto: SetInheritance): Observable<void> {
    return this.http.put<void>(`${this.base(kind, id)}/inheritance`, dto, {
      context: skipHttpErrorNotification(),
    });
  }

  public upsertGrant(kind: SecurableKind, id: number, dto: SaveGrant): Observable<AccessGrant> {
    return this.http.put<AccessGrant>(`${this.base(kind, id)}`, dto, { context: skipHttpErrorNotification() });
  }

  public removeGrant(kind: SecurableKind, id: number, dto: RemoveGrant): Observable<void> {
    // The grant is keyed by its subject, so the subject travels in the request body.
    return this.http.delete<void>(`${this.base(kind, id)}`, { body: dto, context: skipHttpErrorNotification() });
  }

  /** The permissions endpoint for a folder or report — also used by the dialog store's httpResource GET. */
  public base(kind: SecurableKind, id: number): string {
    return `/api/${kind === 'folder' ? 'folders' : 'reports'}/${id}/permissions`;
  }
}
