import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { PermissionsDialogStore } from './permissions-dialog.store';
import { AccessGrant, AccessLevel } from '../../../core/models/permission';
import { PermissionsDialogData } from './permissions-dialog-data';

/**
 * Sharing for a folder or report. Inherited grants are read-only. A view over
 * {@link PermissionsDialogStore}.
 */
@Component({
  selector: 'app-permissions-dialog',
  imports: [FormsModule, SelectModule, CheckboxModule],
  templateUrl: './permissions-dialog.component.html',
  styleUrl: './permissions-dialog.component.scss',
  providers: [PermissionsDialogStore],
})
export class PermissionsDialogComponent {
  private static readonly LEVELS: { label: string; value: AccessLevel }[] = [
    { label: 'Viewer', value: 'viewer' },
    { label: 'Editor', value: 'editor' },
    { label: 'Manager', value: 'manager' },
  ];
  public readonly data = inject<PermissionsDialogData>(DIALOG_DATA);
  public readonly store = inject(PermissionsDialogStore);

  public readonly levels = PermissionsDialogComponent.LEVELS;

  public readonly newSubject = signal<string | null>(null);
  public readonly newLevel = signal<AccessLevel>('viewer');

  private readonly dialogRef = inject(DialogRef<boolean>);

  public levelLabel(level: AccessLevel): string {
    return this.levels.find((l) => l.value === level)?.label ?? level;
  }

  public addGrant(): void {
    const option = this.store.subjectOptions().find((o) => o.value === this.newSubject());
    if (!option) {
      return;
    }
    this.store.addGrant(option, this.newLevel(), () => this.newSubject.set(null));
  }

  public changeLevel(grant: AccessGrant, level: AccessLevel): void {
    this.store.changeLevel(grant, level);
  }

  public close(): void {
    this.dialogRef.close(this.store.changed());
  }
}
