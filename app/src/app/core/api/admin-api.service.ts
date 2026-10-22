import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpErrorNotification } from '../http/http-error-notification.interceptor';
import {
  AdminGroup,
  AdminGroupDetail,
  AdminUser,
  AdminUserDetail,
  DirectoryUser,
  SaveGroup,
  SaveUser,
} from '../models/admin';

/** User and group admin endpoints; {@link directory} is the ungated people list for pickers. */
@Service()
export class AdminApiService {
  private readonly http = inject(HttpClient);

  // The admin screens show these failures inline, so skip the toast.
  private readonly options = { context: HttpErrorNotification.skip() };

  /** The full people directory (ungated), for member/manager pickers. */
  public directory(): Observable<DirectoryUser[]> {
    return this.http.get<DirectoryUser[]>('/api/users', this.options);
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
