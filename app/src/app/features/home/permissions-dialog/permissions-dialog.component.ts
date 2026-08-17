import { Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { Observable, forkJoin } from 'rxjs';
import { PermissionsApiService } from '../../../core/api/permissions-api.service';
import {
  AccessGrant,
  AccessLevel,
  GrantSubjectType,
  Permissions,
  SecurableKind,
  UserGroupSummary,
  UserSummary,
} from '../../../core/models/permission.model';

export interface PermissionsDialogData {
  kind: SecurableKind;
  id: number;
  name: string;
}

interface SubjectOption {
  label: string;
  value: string;
  subjectType: GrantSubjectType;
  subjectId: string | null;
}

const LEVELS: { label: string; value: AccessLevel }[] = [
  { label: 'Viewer', value: 'viewer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Manager', value: 'manager' },
];

/**
 * Manage who can see and edit a folder or report: toggle whether it inherits from its
 * parent, add people or groups at a level, and change or remove the grants set here. The
 * list shows the effective picture — grants inherited from a parent are read-only and
 * labelled with their source; grants set here are editable.
 */
@Component({
  selector: 'app-permissions-dialog',
  imports: [FormsModule, SelectModule, CheckboxModule],
  templateUrl: './permissions-dialog.component.html',
  styleUrl: './permissions-dialog.component.scss',
})
export class PermissionsDialogComponent {
  private readonly dialogRef = inject(DialogRef<boolean>);
  protected readonly data = inject<PermissionsDialogData>(DIALOG_DATA);
  private readonly api = inject(PermissionsApiService);

  protected readonly levels = LEVELS;

  protected readonly permissions = signal<Permissions | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly users = signal<UserSummary[]>([]);
  private readonly groups = signal<UserGroupSummary[]>([]);

  protected readonly newSubject = signal<string | null>(null);
  protected readonly newLevel = signal<AccessLevel>('viewer');

  /** Whether any change was saved, so the page knows to refresh its contents when the dialog closes. */
  private changed = false;

  /** Users, groups and Everyone offered by the add picker, minus subjects already granted here. */
  protected readonly subjectOptions = computed<SubjectOption[]>(() => {
    const used = new Set(
      (this.permissions()?.explicit ?? []).map((g) => `${g.subjectType}:${g.subjectId ?? ''}`),
    );
    const options: SubjectOption[] = [];
    if (!used.has('everyone:')) {
      options.push({ label: 'Everyone', value: 'everyone:', subjectType: 'everyone', subjectId: null });
    }
    for (const user of this.users()) {
      const value = `user:${user.id}`;
      if (!used.has(value)) {
        options.push({ label: user.displayName, value, subjectType: 'user', subjectId: user.id });
      }
    }
    for (const group of this.groups()) {
      const value = `group:${group.id}`;
      if (!used.has(value)) {
        options.push({ label: `${group.name} (group)`, value, subjectType: 'group', subjectId: group.id });
      }
    }
    return options;
  });

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

  protected levelLabel(level: AccessLevel): string {
    return this.levels.find((l) => l.value === level)?.label ?? level;
  }

  protected toggleInherit(inherits: boolean): void {
    // Copy the current effective grants down when breaking, so nobody (including the editor) is locked out.
    this.mutate(this.api.setInheritance(this.data.kind, this.data.id, { inherits, copyDown: true }));
  }

  protected addGrant(): void {
    const option = this.subjectOptions().find((o) => o.value === this.newSubject());
    if (!option) return;
    this.mutate(
      this.api.upsertGrant(this.data.kind, this.data.id, {
        subjectType: option.subjectType,
        subjectId: option.subjectId,
        level: this.newLevel(),
      }),
      () => this.newSubject.set(null),
    );
  }

  protected changeLevel(grant: AccessGrant, level: AccessLevel): void {
    if (grant.level === level) return;
    this.mutate(
      this.api.upsertGrant(this.data.kind, this.data.id, {
        subjectType: grant.subjectType,
        subjectId: grant.subjectId,
        level,
      }),
    );
  }

  protected remove(grant: AccessGrant): void {
    this.mutate(
      this.api.removeGrant(this.data.kind, this.data.id, {
        subjectType: grant.subjectType,
        subjectId: grant.subjectId,
      }),
    );
  }

  protected close(): void {
    this.dialogRef.close(this.changed);
  }

  /** Runs a mutation, then reloads the grants so the effective view reflects it. */
  private mutate(operation: Observable<unknown>, onSuccess?: () => void): void {
    this.saving.set(true);
    this.error.set(null);
    operation.subscribe({
      next: () => {
        this.changed = true;
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
