import { Injectable, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, Dialog } from '@angular/cdk/dialog';
import { httpResource } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import {
  AccessGrant,
  AccessLevel,
  GrantSubjectType,
  Permissions,
  UserGroupSummary,
  UserSummary,
} from '../../../core/models/permission';
import { SubjectOption } from './subject-option';
import { EffectiveRow } from './effective-row';
import type { PermissionsDialogData } from './permissions-dialog-data';
import { PermissionsApiService } from '../../../core/api/permissions-api.service';
import { HttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ConfirmDialogData } from '../confirm-dialog/confirm-dialog-data';

/**
 * A folder or report's sharing grants for {@link PermissionsDialogComponent}. A mutation reloads
 * {@link permissionsResource}.
 */
@Injectable()
export class PermissionsDialogStore {
  private static readonly LEVEL_LABEL: Record<AccessLevel, string> = {
    none: 'No access',
    viewer: 'Viewer',
    editor: 'Editor',
    manager: 'Manager',
  };

  private static readonly GROUP_ORDER: { subjectType: GrantSubjectType; label: string | null }[] = [
    { subjectType: 'everyone', label: null },
    { subjectType: 'group', label: 'Groups' },
    { subjectType: 'user', label: 'People' },
  ];
  public readonly permissions = computed(() =>
    this.permissionsResource.hasValue() ? this.permissionsResource.value() : null,
  );

  public readonly loading = computed(
    () =>
      (this.permissionsResource.isLoading() && !this.permissionsResource.hasValue()) ||
      this.usersResource.isLoading() ||
      this.groupsResource.isLoading(),
  );

  public readonly saving = computed(() => this.mutating() || this.permissionsResource.isLoading());

  public readonly error = computed(() => this.mutateError() ?? this.loadError());

  /** Subjects the add picker offers, minus those already granted. Global admins have implied access. */
  public readonly subjectOptions = computed<SubjectOption[]>(() => {
    const used = new Set(
      (this.permissions()?.explicit ?? []).map((g) => `${g.subjectType}:${g.subjectId ?? ''}`),
    );
    return [
      PermissionsDialogStore.option('everyone', null, 'Everyone'),
      ...this.users()
        .filter((user) => !user.isGlobalAdmin)
        .map((user) => PermissionsDialogStore.option('user', user.id, user.displayName)),
      ...this.groups().map((group) =>
        PermissionsDialogStore.option('group', group.id, `${group.name} (group)`),
      ),
    ].filter((option) => !used.has(option.value));
  });

  /** Everyone, then groups, then people, each alphabetical under a header. */
  public readonly effectiveRows = computed<EffectiveRow[]>(() => {
    const list = this.permissions()?.effective ?? [];
    const rows: EffectiveRow[] = [];
    for (const { subjectType, label } of PermissionsDialogStore.GROUP_ORDER) {
      const matches = list
        .filter((g) => g.subjectType === subjectType)
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      if (!matches.length) {
        continue;
      }
      if (label) {
        rows.push({ kind: 'header', label });
      }
      for (const grant of matches) {
        rows.push({ kind: 'grant', grant });
      }
    }
    return rows;
  });

  public readonly changed = signal(false);

  private readonly data = inject<PermissionsDialogData>(DIALOG_DATA);
  private readonly api = inject(PermissionsApiService);
  private readonly dialog = inject(Dialog);

  private readonly permissionsResource = httpResource<Permissions>(() => ({
    url: this.api.base(this.data.kind, this.data.id),
    context: HttpErrorNotification.skip(),
  }));

  private readonly usersResource = httpResource<UserSummary[]>(
    () => ({ url: '/api/users', context: HttpErrorNotification.skip() }),
    { defaultValue: [] },
  );
  private readonly groupsResource = httpResource<UserGroupSummary[]>(
    () => ({ url: '/api/user-groups', context: HttpErrorNotification.skip() }),
    { defaultValue: [] },
  );

  private readonly users = this.usersResource.value;
  private readonly groups = this.groupsResource.value;

  private readonly mutating = signal(false);
  private readonly mutateError = signal<string | null>(null);

  private readonly loadError = computed(() => {
    const err = this.permissionsResource.error() as { status?: number } | undefined;
    if (!err) {
      return null;
    }
    return err.status === 403
      ? `You need Manager access to change sharing on this ${this.data.kind}.`
      : 'Could not load permissions.';
  });

  private static option(
    subjectType: GrantSubjectType,
    subjectId: string | null,
    label: string,
  ): SubjectOption {
    return { label, value: `${subjectType}:${subjectId ?? ''}`, subjectType, subjectId };
  }

  public toggleInherit(inherits: boolean): void {
    // Copies effective grants down when breaking so nobody is locked out.
    this.mutate(
      this.api.setInheritance(this.data.kind, this.data.id, { inherits, copyDown: true }),
    );
  }

  public addGrant(option: SubjectOption, level: AccessLevel, onSuccess: () => void): void {
    this.confirmBroadAccess(option.subjectType, level).subscribe((proceed) => {
      if (!proceed) {
        return;
      }
      this.mutate(
        this.api.upsertGrant(this.data.kind, this.data.id, {
          subjectType: option.subjectType,
          subjectId: option.subjectId,
          level,
        }),
        onSuccess,
      );
    });
  }

  public changeLevel(grant: AccessGrant, level: AccessLevel): void {
    if (grant.level === level) {
      return;
    }
    this.confirmBroadAccess(grant.subjectType, level).subscribe((proceed) => {
      if (!proceed) {
        return;
      }
      this.mutate(
        this.api.upsertGrant(this.data.kind, this.data.id, {
          subjectType: grant.subjectType,
          subjectId: grant.subjectId,
          level,
        }),
      );
    });
  }

  public remove(grant: AccessGrant): void {
    this.confirmRemoval(grant).subscribe((proceed) => {
      if (!proceed) {
        return;
      }
      this.mutate(
        this.api.removeGrant(this.data.kind, this.data.id, {
          subjectType: grant.subjectType,
          subjectId: grant.subjectId,
        }),
      );
    });
  }

  private mutate(operation: Observable<unknown>, onSuccess?: () => void): void {
    this.mutating.set(true);
    this.mutateError.set(null);
    operation.subscribe({
      next: () => {
        this.changed.set(true);
        onSuccess?.();
        this.mutating.set(false);
        this.permissionsResource.reload();
      },
      error: (err: { status?: number; error?: unknown }) => {
        this.mutating.set(false);
        this.mutateError.set(
          err?.status === 403
            ? 'You need Manager access to make that change.'
            : err?.status === 400 && typeof err.error === 'string'
              ? err.error
              : 'Something went wrong saving that.',
        );
      },
    });
  }

  /** Broad grants to Everyone are confirmed first. */
  private confirmBroadAccess(
    subjectType: GrantSubjectType,
    level: AccessLevel,
  ): Observable<boolean> {
    if (subjectType !== 'everyone' || (level !== 'editor' && level !== 'manager')) {
      return of(true);
    }
    const capability =
      level === 'manager' ? 'manage its sharing and edit its content' : 'edit its content';
    return this.dialog
      .open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Give everyone broad access?',
          message: `Setting Everyone to ${PermissionsDialogStore.LEVEL_LABEL[level]} means anyone who can open this ${this.data.kind} will be able to ${capability}.`,
          confirmLabel: 'Grant access',
        } satisfies ConfirmDialogData,
      })
      .closed.pipe(map((confirmed) => !!confirmed));
  }

  private confirmRemoval(grant: AccessGrant): Observable<boolean> {
    return this.dialog
      .open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Remove access',
          message: `Remove ${grant.subjectName}'s access to this ${this.data.kind}?`,
          confirmLabel: 'Remove',
          danger: true,
        } satisfies ConfirmDialogData,
      })
      .closed.pipe(map((confirmed) => !!confirmed));
  }
}
