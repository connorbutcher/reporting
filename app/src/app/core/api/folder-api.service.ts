import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Folder } from '../models/folder.model';

@Service()
export class FolderApiService {
  private readonly http = inject(HttpClient);

  /** The whole flat folder list — only meant for things that need the full tree at once, like the move picker. */
  list(): Observable<Folder[]> {
    return this.http.get<Folder[]>('/api/folders');
  }

  /** Direct child folders of `parentId` (root if omitted), each flagged with whether it has children of its own. */
  children(parentId: string | null): Observable<Folder[]> {
    const params = parentId ? { parentId } : undefined;
    return this.http.get<Folder[]>('/api/folders/children', { params });
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
