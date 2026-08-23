import { Injectable, inject, signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Observable, defer, filter, forkJoin, map, switchMap, tap } from 'rxjs';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { Folder } from '../../core/models/folder.model';
import { ReportSummary } from '../../core/models/report';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from './confirm-dialog/confirm-dialog.component';
import {
  CreateDialogComponent,
  CreateDialogData,
  CreateDialogResult,
} from './create-dialog/create-dialog.component';
import { MoveDialogComponent, MoveDialogData } from './move-dialog/move-dialog.component';
import {
  PermissionsDialogComponent,
  PermissionsDialogData,
} from './permissions-dialog/permissions-dialog.component';
import { RenameDialogComponent, RenameDialogData } from './rename-dialog/rename-dialog.component';
import { ContentRow } from './content-row';

/** What a completed create resolved to, so the page can reload or open the new report. */
export type CreateOutcome = { kind: 'folder' } | { kind: 'report'; reportId: number };

/**
 * The row/create dialog flows for the home page, pulled out of the component so
 * it keeps only browsing state. Each method opens its dialog and performs the
 * chosen mutation, emitting once on success; cancelling completes without
 * emitting. The page stays the single owner of what happens next (reload the
 * contents, refresh a tree node, navigate, or surface an error).
 */
@Injectable()
export class HomeItemActionsService {
  private readonly dialog = inject(Dialog);
  private readonly folderApi = inject(FolderApiService);
  private readonly reportApi = inject(ReportApiService);

  /**
   * True only while {@link move} or {@link create} are prefetching the data their dialog needs
   * to build its folder tree — the two flows with a gap between the trigger and the dialog
   * appearing. Rename/remove/permissions open their dialog immediately, so they never set this.
   */
  readonly busy = signal(false);

  rename(row: ContentRow): Observable<void> {
    return defer(
      () =>
        this.dialog.open<string | undefined>(RenameDialogComponent, {
          data: { kind: row.kind, currentName: row.name } satisfies RenameDialogData,
        }).closed,
    ).pipe(
      filter((newName): newName is string => !!newName),
      switchMap((newName) =>
        row.kind === 'folder'
          ? this.folderApi.rename(row.id, newName, row.folder.parentFolderId)
          : this.reportApi.rename(row.id, newName, row.report.folderId),
      ),
      map(() => undefined),
    );
  }

  /** Emits the chosen destination folder (null = root) on a successful move. */
  move(row: ContentRow): Observable<number | null> {
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
        const moved: Observable<Folder | ReportSummary> =
          row.kind === 'folder'
            ? this.folderApi.move(row.id, destination, row.name)
            : this.reportApi.move(row.id, destination, row.name);
        return moved.pipe(map(() => destination));
      }),
    );
  }

  /** Emits on a confirmed, successful delete; errors propagate so the page can explain a 409. */
  remove(row: ContentRow): Observable<void> {
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
      switchMap(() =>
        row.kind === 'folder' ? this.folderApi.remove(row.id) : this.reportApi.remove(row.id),
      ),
      map(() => undefined),
    );
  }

  /** Opens the sharing dialog for a folder or report; emits true if any grant or inheritance change was saved. */
  permissions(row: ContentRow): Observable<boolean> {
    return defer(
      () =>
        this.dialog.open<boolean>(PermissionsDialogComponent, {
          data: { kind: row.kind, id: row.id, name: row.name } satisfies PermissionsDialogData,
        }).closed,
    ).pipe(map((changed) => !!changed));
  }

  /** Opens the create dialog under the given folder; emits what was created. */
  create(folderId: number | null): Observable<CreateOutcome> {
    this.busy.set(true);
    return forkJoin({ folders: this.folderApi.list(), reports: this.reportApi.listAll() }).pipe(
      tap({ next: () => this.busy.set(false), error: () => this.busy.set(false) }),
      switchMap(
        ({ folders, reports }) =>
          this.dialog.open<CreateDialogResult | undefined>(CreateDialogComponent, {
            data: { folders, reports } satisfies CreateDialogData,
          }).closed,
      ),
      filter((result): result is CreateDialogResult => !!result),
      switchMap((result) =>
        result.kind === 'folder'
          ? this.folderApi
              .create(result.name, folderId)
              .pipe(map((): CreateOutcome => ({ kind: 'folder' })))
          : this.reportApi
              .create(result.name, folderId, result.sourceReportId)
              .pipe(map((report): CreateOutcome => ({ kind: 'report', reportId: report.id }))),
      ),
    );
  }
}
