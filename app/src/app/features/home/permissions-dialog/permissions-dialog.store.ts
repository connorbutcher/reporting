import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, Dialog } from '@angular/cdk/dialog';
import { Observable, map, of } from 'rxjs';
import { PermissionsApiService } from '../../../core/api/permissions-api.service';
import { skipHttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import {
  AccessGrant,
  AccessLevel,
  GrantSubjectType,
  Permissions,
  UserGroupSummary,
  UserSummary,
} from '../../../core/models/permission';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import type { PermissionsDialogData } from './permissions-dialog.component';

export interface SubjectOption {
  label: string;
  value: string;
  subjectType: GrantSubjectType;
  subjectId: string | null;
}

/** One row of the effective-access list: either a group label or a grant, in display order. */
export type EffectiveRow = { kind: 'header'; label: string } | { kind: 'grant'; grant: AccessGrant };

const LEVEL_LABEL: Record<AccessLevel, string> = {
  none: 'No access',
  viewer: 'Viewer',
  editor: 'Editor',
  manager: 'Manager',
};

/** Display order for the effective list: Everyone (unlabelled, at most one row), then Groups, then People. */
const GROUP_ORDER: { subjectType: GrantSubjectType; label: string | null }[] = [
  { subjectType: 'everyone', label: null },
  { subjectType: 'group', label: 'Groups' },
  { subjectType: 'user', label: 'People' },
];

/**
 * Loads and mutates a folder or report's sharing grants for {@link PermissionsDialogComponent},
 * which stays a thin view over this. A component-provided collaborator — constructed by Angular
 * DI, not `new`'d — so it reads the same {@link DIALOG_DATA} the component does.
 *
 * Permissions, users and groups are each an `httpResource`, refetched declaratively — a mutation
 * reloads {@link permissionsResource} rather than the store re-fetching by hand.
 */
@Injectable()
export class PermissionsDialogStore {
  public readonly permissions = computed(() =>
    this.permissionsResource.hasValue() ? this.permissionsResource.value() : null,
  );

  /** True until the initial load (permissions + subject pickers) finishes; a later reload doesn't retrigger it. */
  public readonly loading = computed(
    () =>
      (this.permissionsResource.isLoading() && !this.permissionsResource.hasValue()) ||
      this.usersResource.isLoading() ||
      this.groupsResource.isLoading(),
  );

  /** A mutation is in flight, or the grants are refetching after one — either way, edits are disabled. */
  public readonly saving = computed(() => this.mutating() || this.permissionsResource.isLoading());

  public readonly error = computed(() => this.mutateError() ?? this.loadError());

  /** Users, groups and Everyone offered by the add picker, minus subjects already granted here. */
  public readonly subjectOptions = computed<SubjectOption[]>(() => {
    const used = new Set(
      (this.permissions()?.explicit ?? []).map((g) => `${g.subjectType}:${g.subjectId ?? ''}`),
    );
    const options: SubjectOption[] = [];
    if (!used.has('everyone:')) {
      options.push({
        label: 'Everyone',
        value: 'everyone:',
        subjectType: 'everyone',
        subjectId: null,
      });
    }
    for (const user of this.users()) {
      // A global admin's access is inferred from that status, so there's nothing to grant them.
      if (user.isGlobalAdmin) continue;
      const value = `user:${user.id}`;
      if (!used.has(value)) {
        options.push({ label: user.displayName, value, subjectType: 'user', subjectId: user.id });
      }
    }
    for (const group of this.groups()) {
      const value = `group:${group.id}`;
      if (!used.has(value)) {
        options.push({
          label: `${group.name} (group)`,
          value,
          subjectType: 'group',
          subjectId: group.id,
        });
      }
    }
    return options;
  });

  /**
   * The effective grants for display: Everyone first, then groups, then people — each of the
   * latter two alphabetical by name, with a header row when that section isn't empty.
   */
  public readonly effectiveRows = computed<EffectiveRow[]>(() => {
    const list = this.permissions()?.effective ?? [];
    const rows: EffectiveRow[] = [];
    for (const { subjectType, label } of GROUP_ORDER) {
      const matches = list
        .filter((g) => g.subjectType === subjectType)
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      if (!matches.length) continue;
      if (label) rows.push({ kind: 'header', label });
      for (const grant of matches) rows.push({ kind: 'grant', grant });
    }
    return rows;
  });

  /** Whether any change was saved, so the dialog can tell the page to refresh its contents when it closes. */
  public readonly changed = signal(false);

  private readonly data = inject<PermissionsDialogData>(DIALOG_DATA);
  private readonly api = inject(PermissionsApiService);
  private readonly dialog = inject(Dialog);

  private readonly permissionsResource = httpResource<Permissions>(() => ({
    url: this.api.base(this.data.kind, this.data.id),
    context: skipHttpErrorNotification(),
  }));

  // Loaded once alongside the permissions; not reloaded on mutation.
  private readonly usersResource = httpResource<UserSummary[]>(
    () => ({ url: '/api/users', context: skipHttpErrorNotification() }),
    { defaultValue: [] },
  );
  private readonly groupsResource = httpResource<UserGroupSummary[]>(
    () => ({ url: '/api/user-groups', context: skipHttpErrorNotification() }),
    { defaultValue: [] },
  );

  private readonly users = this.usersResource.value;
  private readonly groups = this.groupsResource.value;

  /** True while a PUT/DELETE mutation itself is in flight (before the post-mutation reload starts). */
  private readonly mutating = signal(false);
  private readonly mutateError = signal<string | null>(null);

  /** A failure loading the permissions themselves, e.g. viewing sharing without Manager access. */
  private readonly loadError = computed(() => {
    const err = this.permissionsResource.error() as { status?: number } | undefined;
    if (!err) return null;
    return err.status === 403
      ? `You need Manager access to change sharing on this ${this.data.kind}.`
      : 'Could not load permissions.';
  });

  public toggleInherit(inherits: boolean): void {
    // Copy the current effective grants down when breaking, so nobody (including the editor) is locked out.
    this.mutate(
      this.api.setInheritance(this.data.kind, this.data.id, { inherits, copyDown: true }),
    );
  }

  public addGrant(option: SubjectOption, level: AccessLevel, onSuccess: () => void): void {
    this.confirmBroadAccess(option.subjectType, level).subscribe((proceed) => {
      if (!proceed) return;
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
    if (grant.level === level) return;
    this.confirmBroadAccess(grant.subjectType, level).subscribe((proceed) => {
      if (!proceed) return;
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
      if (!proceed) return;
      this.mutate(
        this.api.removeGrant(this.data.kind, this.data.id, {
          subjectType: grant.subjectType,
          subjectId: grant.subjectId,
        }),
      );
    });
  }

  /** Runs a mutation, then reloads the grants so the effective view reflects it. */
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

  /**
   * Setting Everyone to Editor or Manager hands broad rights to anyone who can open this folder or
   * report, so it's confirmed first; every other grant proceeds straight away.
   */
  private confirmBroadAccess(subjectType: GrantSubjectType, level: AccessLevel): Observable<boolean> {
    if (subjectType !== 'everyone' || (level !== 'editor' && level !== 'manager')) return of(true);
    const capability = level === 'manager' ? 'manage its sharing and edit its content' : 'edit its content';
    return this.dialog
      .open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Give everyone broad access?',
          message: `Setting Everyone to ${LEVEL_LABEL[level]} means anyone who can open this ${this.data.kind} will be able to ${capability}.`,
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
