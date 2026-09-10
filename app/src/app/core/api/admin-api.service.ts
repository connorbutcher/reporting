import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { skipHttpErrorNotification } from '../http/http-error-notification.interceptor';
import {
  AdminGroup,
  AdminGroupDetail,
  AdminUser,
  AdminUserDetail,
  SaveGroup,
  SaveUser,
  UserRef,
} from '../models/admin';

/**
 * The `/api/admin` endpoints for managing users and groups. The user/group admin endpoints require
 * the manage-users permission (delegated group managers are scoped by the server); {@link directory}
 * is the ungated people list used to pick members and managers.
 */
@Service()
export class AdminApiService {
  private readonly http = inject(HttpClient);

  // The admin screens render access/not-found failures inline (a load-error banner, a per-field
  // message), so they opt out of the global toast to avoid doubling up on their own messaging.
  private readonly options = { context: skipHttpErrorNotification() };

  /** The full people directory (ungated), for member/manager pickers. */
  public directory(): Observable<UserRef[]> {
    return this.http.get<UserRef[]>('/api/users', this.options);
  }

  public listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users', this.options);
  }

  public getUser(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`/api/admin/users/${id}`, this.options);
  }

  public createUser(dto: SaveUser): Observable<AdminUserDetail> {
    return this.http.post<AdminUserDetail>('/api/admin/users', dto, this.options);
  }

  public updateUser(id: string, dto: SaveUser): Observable<AdminUserDetail> {
    return this.http.put<AdminUserDetail>(`/api/admin/users/${id}`, dto, this.options);
  }

  public listGroups(): Observable<AdminGroup[]> {
    return this.http.get<AdminGroup[]>('/api/admin/user-groups', this.options);
  }

  public getGroup(id: string): Observable<AdminGroupDetail> {
    return this.http.get<AdminGroupDetail>(`/api/admin/user-groups/${id}`, this.options);
  }

  public createGroup(dto: SaveGroup): Observable<AdminGroupDetail> {
    return this.http.post<AdminGroupDetail>('/api/admin/user-groups', dto, this.options);
  }

  public updateGroup(id: string, dto: SaveGroup): Observable<AdminGroupDetail> {
    return this.http.put<AdminGroupDetail>(`/api/admin/user-groups/${id}`, dto, this.options);
  }

  public deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/user-groups/${id}`, this.options);
  }
}
