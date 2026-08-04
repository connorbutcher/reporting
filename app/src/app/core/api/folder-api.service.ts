import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Folder } from '../models/folder.model';

@Service()
export class FolderApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<Folder[]> {
    return this.http.get<Folder[]>('/api/folders');
  }

  create(name: string, parentFolderId: string | null): Observable<Folder> {
    return this.http.post<Folder>('/api/folders', { name, parentFolderId });
  }

  rename(id: string, name: string, parentFolderId: string | null): Observable<Folder> {
    return this.http.put<Folder>(`/api/folders/${id}`, { name, parentFolderId });
  }

  move(id: string, parentFolderId: string | null, name: string): Observable<Folder> {
    return this.rename(id, name, parentFolderId);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/folders/${id}`);
  }
}
