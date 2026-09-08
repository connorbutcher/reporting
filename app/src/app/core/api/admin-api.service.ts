import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminGroup,
  AdminGroupDetail,
  AdminUser,
  AdminUserDetail,
  SaveGroup,
  SaveUser,
} from '../models/admin';

/** The `/api/admin` endpoints for managing users and groups. All require the manage-users permission. */
@Service()
export class AdminApiService {
  private readonly http = inject(HttpClient);

  public listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users');
  }

  public getUser(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`/api/admin/users/${id}`);
  }

  public createUser(dto: SaveUser): Observable<AdminUserDetail> {
    return this.http.post<AdminUserDetail>('/api/admin/users', dto);
  }

  public updateUser(id: string, dto: SaveUser): Observable<AdminUserDetail> {
    return this.http.put<AdminUserDetail>(`/api/admin/users/${id}`, dto);
  }

  public listGroups(): Observable<AdminGroup[]> {
    return this.http.get<AdminGroup[]>('/api/admin/user-groups');
  }

  public getGroup(id: string): Observable<AdminGroupDetail> {
    return this.http.get<AdminGroupDetail>(`/api/admin/user-groups/${id}`);
  }

  public createGroup(dto: SaveGroup): Observable<AdminGroupDetail> {
    return this.http.post<AdminGroupDetail>('/api/admin/user-groups', dto);
  }

  public updateGroup(id: string, dto: SaveGroup): Observable<AdminGroupDetail> {
    return this.http.put<AdminGroupDetail>(`/api/admin/user-groups/${id}`, dto);
  }

  public deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/user-groups/${id}`);
  }
}
