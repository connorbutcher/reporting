import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpErrorNotification } from '../http/http-error-notification.interceptor';
import {
  AccessGrant,
  RemoveGrant,
  SaveGrant,
  SecurableKind,
  SetInheritance,
} from '../models/permission';

/** Permission mutations. Reads go through `httpResource` on the URLs {@link base} builds. */
@Service()
export class PermissionsApiService {
  private readonly http = inject(HttpClient);

  public setInheritance(kind: SecurableKind, id: number, dto: SetInheritance): Observable<void> {
    return this.http.put<void>(`${this.base(kind, id)}/inheritance`, dto, {
      context: HttpErrorNotification.skip(),
    });
  }

  public upsertGrant(kind: SecurableKind, id: number, dto: SaveGrant): Observable<AccessGrant> {
    return this.http.put<AccessGrant>(`${this.base(kind, id)}`, dto, {
      context: HttpErrorNotification.skip(),
    });
  }

  public removeGrant(kind: SecurableKind, id: number, dto: RemoveGrant): Observable<void> {
    // The grant is keyed by its subject, so the subject travels in the request body.
    return this.http.delete<void>(`${this.base(kind, id)}`, {
      body: dto,
      context: HttpErrorNotification.skip(),
    });
  }

  /** The permissions endpoint for a folder or report — also used by the dialog store's httpResource GET. */
  public base(kind: SecurableKind, id: number): string {
    return `/api/${kind === 'folder' ? 'folders' : 'reports'}/${id}/permissions`;
  }
}
