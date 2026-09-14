import { Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { AccessGrant, AccessLevel, SecurableKind } from '../../../core/models/permission';
import { PermissionsDialogStore } from './permissions-dialog.store';

export interface PermissionsDialogData {
  kind: SecurableKind;
  id: number;
  name: string;
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
 *
 * A thin view over {@link PermissionsDialogStore}, which owns the loading and mutations.
 */
@Component({
  selector: 'app-permissions-dialog',
  imports: [FormsModule, SelectModule, CheckboxModule],
  templateUrl: './permissions-dialog.component.html',
  styleUrl: './permissions-dialog.component.scss',
  providers: [PermissionsDialogStore],
})
export class PermissionsDialogComponent {
  public readonly data = inject<PermissionsDialogData>(DIALOG_DATA);
  public readonly store = inject(PermissionsDialogStore);

  public readonly levels = LEVELS;

  public readonly newSubject = signal<string | null>(null);
  public readonly newLevel = signal<AccessLevel>('viewer');

  private readonly dialogRef = inject(DialogRef<boolean>);

  public levelLabel(level: AccessLevel): string {
    return this.levels.find((l) => l.value === level)?.label ?? level;
  }

  public addGrant(): void {
    const option = this.store.subjectOptions().find((o) => o.value === this.newSubject());
    if (!option) return;
    this.store.addGrant(option, this.newLevel(), () => this.newSubject.set(null));
  }

  public changeLevel(grant: AccessGrant, level: AccessLevel): void {
    this.store.changeLevel(grant, level);
  }

  public close(): void {
    this.dialogRef.close(this.store.changed());
  }
}
