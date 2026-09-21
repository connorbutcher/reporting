import { Injectable, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Observable, forkJoin } from 'rxjs';
import { PermissionsApiService } from '../../../core/api/permissions-api.service';
import {
  AccessGrant,
  AccessLevel,
  GrantSubjectType,
  Permissions,
  UserGroupSummary,
  UserSummary,
} from '../../../core/models/permission';
import type { PermissionsDialogData } from './permissions-dialog.component';

export interface SubjectOption {
  label: string;
  value: string;
  subjectType: GrantSubjectType;
  subjectId: string | null;
}

/**
 * Loads and mutates a folder or report's sharing grants for {@link PermissionsDialogComponent},
 * which stays a thin view over this. A component-provided collaborator — constructed by Angular
 * DI, not `new`'d — so it reads the same {@link DIALOG_DATA} the component does.
 */
@Injectable()
export class PermissionsDialogStore {
  public readonly permissions = signal<Permissions | null>(null);
  public readonly loading = signal(true);
  public readonly saving = signal(false);
  public readonly error = signal<string | null>(null);

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

  /** Whether any change was saved, so the dialog can tell the page to refresh its contents when it closes. */
  public readonly changed = signal(false);

  private readonly data = inject<PermissionsDialogData>(DIALOG_DATA);
  private readonly api = inject(PermissionsApiService);

  private readonly users = signal<UserSummary[]>([]);
  private readonly groups = signal<UserGroupSummary[]>([]);

  constructor() {
    this.loading.set(true);
    forkJoin({
      permissions: this.api.get(this.data.kind, this.data.id),
      users: this.api.users(),
      groups: this.api.groups(),
    }).subscribe({
      next: ({ permissions, users, groups }) => {
        this.permissions.set(permissions);
        this.users.set(users);
        this.groups.set(groups);
        this.loading.set(false);
      },
      error: (err: { status?: number }) => {
        this.error.set(
          err?.status === 403
            ? `You need Manager access to change sharing on this ${this.data.kind}.`
            : 'Could not load permissions.',
        );
        this.loading.set(false);
      },
    });
  }

  public toggleInherit(inherits: boolean): void {
    // Copy the current effective grants down when breaking, so nobody (including the editor) is locked out.
    this.mutate(
      this.api.setInheritance(this.data.kind, this.data.id, { inherits, copyDown: true }),
    );
  }

  public addGrant(option: SubjectOption, level: AccessLevel, onSuccess: () => void): void {
    this.mutate(
      this.api.upsertGrant(this.data.kind, this.data.id, {
        subjectType: option.subjectType,
        subjectId: option.subjectId,
        level,
      }),
      onSuccess,
    );
  }

  public changeLevel(grant: AccessGrant, level: AccessLevel): void {
    if (grant.level === level) return;
    this.mutate(
      this.api.upsertGrant(this.data.kind, this.data.id, {
        subjectType: grant.subjectType,
        subjectId: grant.subjectId,
        level,
      }),
    );
  }

  public remove(grant: AccessGrant): void {
    this.mutate(
      this.api.removeGrant(this.data.kind, this.data.id, {
        subjectType: grant.subjectType,
        subjectId: grant.subjectId,
      }),
    );
  }

  /** Runs a mutation, then reloads the grants so the effective view reflects it. */
  private mutate(operation: Observable<unknown>, onSuccess?: () => void): void {
    this.saving.set(true);
    this.error.set(null);
    operation.subscribe({
      next: () => {
        this.changed.set(true);
        onSuccess?.();
        this.api.get(this.data.kind, this.data.id).subscribe({
          next: (permissions) => {
            this.permissions.set(permissions);
            this.saving.set(false);
          },
          error: () => {
            this.saving.set(false);
            this.error.set('Could not refresh permissions.');
          },
        });
      },
      error: (err: { status?: number; error?: unknown }) => {
        this.saving.set(false);
        this.error.set(
          err?.status === 403
            ? 'You need Manager access to make that change.'
            : err?.status === 400 && typeof err.error === 'string'
              ? err.error
              : 'Something went wrong saving that.',
        );
      },
    });
  }
}
