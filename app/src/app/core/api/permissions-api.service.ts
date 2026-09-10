import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { skipHttpErrorNotification } from '../http/http-error-notification.interceptor';
import {
  AccessGrant,
  Permissions,
  RemoveGrant,
  SaveGrant,
  SecurableKind,
  SetInheritance,
  UserGroupSummary,
  UserSummary,
} from '../models/permission';

/** The `/permissions` API for folders and reports, plus the subject pickers. */
@Service()
export class PermissionsApiService {
  private readonly http = inject(HttpClient);

  // The permissions dialog renders access/validation failures inline (a banner naming the reason,
  // e.g. losing manage access), so it opts out of the global toast to avoid doubling up.
  private readonly options = { context: skipHttpErrorNotification() };

  users(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>('/api/users', this.options);
  }

  groups(): Observable<UserGroupSummary[]> {
    return this.http.get<UserGroupSummary[]>('/api/user-groups', this.options);
  }

  get(kind: SecurableKind, id: number): Observable<Permissions> {
    return this.http.get<Permissions>(`${this.base(kind, id)}`, this.options);
  }

  setInheritance(kind: SecurableKind, id: number, dto: SetInheritance): Observable<void> {
    return this.http.put<void>(`${this.base(kind, id)}/inheritance`, dto, this.options);
  }

  upsertGrant(kind: SecurableKind, id: number, dto: SaveGrant): Observable<AccessGrant> {
    return this.http.put<AccessGrant>(`${this.base(kind, id)}`, dto, this.options);
  }

  removeGrant(kind: SecurableKind, id: number, dto: RemoveGrant): Observable<void> {
    // The grant is keyed by its subject, so the subject travels in the request body.
    return this.http.delete<void>(`${this.base(kind, id)}`, { body: dto, context: skipHttpErrorNotification() });
  }

  private base(kind: SecurableKind, id: number): string {
    return `/api/${kind === 'folder' ? 'folders' : 'reports'}/${id}/permissions`;
  }
}
