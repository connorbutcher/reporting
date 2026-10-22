import { Injectable, inject, signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Observable, defer, filter, finalize, forkJoin, map, switchMap, tap } from 'rxjs';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { ContentRow } from './models/content-row';
import { RenameDialogComponent } from './rename-dialog/rename-dialog.component';
import { RenameDialogData } from './rename-dialog/rename-dialog-data';
import { Folder } from '../../core/models/folder/folder.model';
import { ReportSummary } from '../../core/models/report';
import { MoveDialogComponent } from './move-dialog/move-dialog.component';
import { MoveDialogData } from './move-dialog/move-dialog-data';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ConfirmDialogData } from './confirm-dialog/confirm-dialog-data';
import { PermissionsDialogComponent } from './permissions-dialog/permissions-dialog.component';
import { PermissionsDialogData } from './permissions-dialog/permissions-dialog-data';
import { CreateOutcome } from './create-outcome';
import { CreateDialogResult } from './create-dialog/create-dialog-result';
import { CreateDialogComponent } from './create-dialog/create-dialog.component';
import { CreateDialogData } from './create-dialog/create-dialog-data';

/**
 * Home row and create dialog flows. Each emits once on success and completes without emitting on
 * cancel; the page decides what happens next.
 */
@Injectable()
export class HomeItemActionsService {
  /** True while a row action prefetches for its dialog or runs its mutation, for the toolbar. */
  public readonly busy = signal(false);

  private readonly dialog = inject(Dialog);
  private readonly folderApi = inject(FolderApiService);
  private readonly reportApi = inject(ReportApiService);

  public rename(row: ContentRow): Observable<void> {
    const folderId = row.kind === 'folder' ? row.folder.parentFolderId : row.report.folderId;
    return defer(
      () =>
        this.dialog.open<string | undefined>(RenameDialogComponent, {
          data: {
            kind: row.kind,
            id: row.id,
            currentName: row.name,
            folderId,
          } satisfies RenameDialogData,
        }).closed,
    ).pipe(
      filter((newName): newName is string => !!newName),
      switchMap((newName) => {
        this.busy.set(true);
        const renamed: Observable<Folder | ReportSummary> =
          row.kind === 'folder'
            ? this.folderApi.rename(row.id, newName, row.folder.parentFolderId)
            : this.reportApi.rename(row.id, newName, row.report.folderId);
        return renamed.pipe(finalize(() => this.busy.set(false)));
      }),
      map(() => undefined),
    );
  }

  /** Emits the destination folder (null is the root). */
  public move(row: ContentRow): Observable<number | null> {
    const currentFolderId = row.kind === 'folder' ? row.folder.parentFolderId : row.report.folderId;
    this.busy.set(true);
    return this.folderApi.list().pipe(
      tap({ next: () => this.busy.set(false), error: () => this.busy.set(false) }),
      switchMap(
        (allFolders) =>
          this.dialog.open<number | null | undefined>(MoveDialogComponent, {
            data: {
              kind: row.kind,
              itemName: row.name,
              folders: allFolders,
              currentFolderId,
              excludeSubtreeOf: row.kind === 'folder' ? row.id : undefined,
            } satisfies MoveDialogData,
          }).closed,
      ),
      filter((destination): destination is number | null => destination !== undefined),
      switchMap((destination) => {
        this.busy.set(true);
        const moved: Observable<Folder | ReportSummary> =
          row.kind === 'folder'
            ? this.folderApi.move(row.id, destination, row.name)
            : this.reportApi.move(row.id, destination, row.name);
        return moved.pipe(
          map(() => destination),
          finalize(() => this.busy.set(false)),
        );
      }),
    );
  }

  /** Errors propagate so the page can explain a 409. */
  public remove(row: ContentRow): Observable<void> {
    return defer(
      () =>
        this.dialog.open<boolean>(ConfirmDialogComponent, {
          data: {
            title: `Delete ${row.kind}`,
            message:
              row.kind === 'folder'
                ? `Delete "${row.name}"? The folder must be empty. This can't be undone.`
                : `Delete "${row.name}"? This removes all of its versions and can't be undone.`,
            confirmLabel: 'Delete',
            danger: true,
          } satisfies ConfirmDialogData,
        }).closed,
    ).pipe(
      filter((confirmed): confirmed is boolean => !!confirmed),
      switchMap(() => {
        this.busy.set(true);
        const removed =
          row.kind === 'folder' ? this.folderApi.remove(row.id) : this.reportApi.remove(row.id);
        return removed.pipe(finalize(() => this.busy.set(false)));
      }),
      map(() => undefined),
    );
  }

  /** Emits true if anything was saved. */
  public permissions(row: ContentRow): Observable<boolean> {
    return defer(
      () =>
        this.dialog.open<boolean>(PermissionsDialogComponent, {
          data: { kind: row.kind, id: row.id, name: row.name } satisfies PermissionsDialogData,
        }).closed,
    ).pipe(map((changed) => !!changed));
  }

  public create(folderId: number | null): Observable<CreateOutcome> {
    this.busy.set(true);
    return forkJoin({ folders: this.folderApi.list(), reports: this.reportApi.listAll() }).pipe(
      tap({ next: () => this.busy.set(false), error: () => this.busy.set(false) }),
      switchMap(
        ({ folders, reports }) =>
          this.dialog.open<CreateDialogResult | undefined>(CreateDialogComponent, {
            data: { folders, reports, folderId } satisfies CreateDialogData,
          }).closed,
      ),
      filter((result): result is CreateDialogResult => !!result),
      switchMap((result) => {
        this.busy.set(true);
        const created =
          result.kind === 'folder'
            ? this.folderApi
                .create(result.name, folderId)
                .pipe(map((): CreateOutcome => ({ kind: 'folder' })))
            : this.reportApi
                .create(result.name, folderId, result.sourceReportId)
                .pipe(map((report): CreateOutcome => ({ kind: 'report', reportId: report.id })));
        return created.pipe(finalize(() => this.busy.set(false)));
      }),
    );
  }
}
