import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AccessGrant,
  Permissions,
  RemoveGrant,
  SaveGrant,
  SecurableKind,
  SetInheritance,
  UserGroupSummary,
  UserSummary,
} from '../models/permission.model';

/** The `/permissions` API for folders and reports, plus the subject pickers. */
@Service()
export class PermissionsApiService {
  private readonly http = inject(HttpClient);

  users(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>('/api/users');
  }

  groups(): Observable<UserGroupSummary[]> {
    return this.http.get<UserGroupSummary[]>('/api/user-groups');
  }

  get(kind: SecurableKind, id: string): Observable<Permissions> {
    return this.http.get<Permissions>(`${this.base(kind, id)}`);
  }

  setInheritance(kind: SecurableKind, id: string, dto: SetInheritance): Observable<void> {
    return this.http.put<void>(`${this.base(kind, id)}/inheritance`, dto);
  }

  upsertGrant(kind: SecurableKind, id: string, dto: SaveGrant): Observable<AccessGrant> {
    return this.http.put<AccessGrant>(`${this.base(kind, id)}`, dto);
  }

  removeGrant(kind: SecurableKind, id: string, dto: RemoveGrant): Observable<void> {
    // The grant is keyed by its subject, so the subject travels in the request body.
    return this.http.delete<void>(`${this.base(kind, id)}`, { body: dto });
  }

  private base(kind: SecurableKind, id: string): string {
    return `/api/${kind === 'folder' ? 'folders' : 'reports'}/${id}/permissions`;
  }
}
