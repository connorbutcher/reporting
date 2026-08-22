import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { DatasetColumn, DatasetColumnType } from '../../../core/models/dataset.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../home/confirm-dialog/confirm-dialog.component';
import { DatasetsStore } from '../datasets.store';

const COLUMN_TYPES: { label: string; value: DatasetColumnType }[] = [
  { label: 'Text', value: 'string' },
  { label: 'Whole number', value: 'int' },
  { label: 'Decimal', value: 'double' },
  { label: 'Yes / No', value: 'bool' },
  { label: 'Date', value: 'dateTime' },
];

/** Icon shown alongside a column to signal its data type at a glance. */
const TYPE_ICONS: Record<DatasetColumnType, string> = {
  string: 'pi pi-align-left',
  int: 'pi pi-hashtag',
  double: 'pi pi-hashtag',
  bool: 'pi pi-check-square',
  dateTime: 'pi pi-calendar',
};

/** The selected dataset's column schema: list, reorder, rename, retype and add. */
@Component({
  selector: 'app-dataset-columns-panel',
  imports: [FormsModule, FormField, ButtonModule, InputTextModule, SelectModule, SkeletonModule],
  templateUrl: './dataset-columns-panel.component.html',
  styleUrl: './dataset-columns-panel.component.scss',
})
export class DatasetColumnsPanelComponent {
  private readonly store = inject(DatasetsStore);
  private readonly dialog = inject(Dialog);

  protected readonly columns = this.store.columns;
  protected readonly loading = this.store.schemaLoading;
  protected readonly columnTypes = COLUMN_TYPES;

  // The add-a-column row is a signal form: a required, unique name plus a type.
  // The duplicate check runs as a live validator (reading the current columns),
  // so a clashing name disables Add and shows a message as it's typed.
  private readonly draft = signal<{ name: string; type: DatasetColumnType }>({
    name: '',
    type: 'string',
  });
  protected readonly addForm = form(this.draft, (path) => {
    required(path.name, { message: 'A column name is required.' });
    validate(path.name, ({ value }) => {
      const name = value().trim();
      if (name && this.nameTaken(name, null)) {
        return { kind: 'duplicate', message: `A column named "${name}" already exists.` };
      }
      return null;
    });
  });

  /** The duplicate-name message for the add row, shown as it's typed (never the plain "required"). */
  protected readonly addNameError = computed(
    () => this.addForm.name().errors().find((e) => e.kind === 'duplicate')?.message ?? null,
  );

  /** A message shown under the add row when a column rename is rejected as a duplicate. */
  protected readonly renameError = signal<string | null>(null);

  protected typeIcon(type: DatasetColumnType): string {
    return TYPE_ICONS[type];
  }

  protected add(): void {
    if (!this.addForm().valid()) return;
    const { name, type } = this.addForm().value();
    this.store.addColumn(name.trim(), type);
    this.addForm.name().value.set('');
  }

  /** Commits a column rename, but restores the field if the name is blank or a duplicate. */
  protected onRenameBlur(column: DatasetColumn, event: Event): void {
    const input = event.target as HTMLInputElement;
    const name = input.value.trim();
    if (!name || this.nameTaken(name, column)) {
      input.value = column.name;
      if (name && this.nameTaken(name, column)) {
        this.renameError.set(`A column named "${name}" already exists.`);
      }
      return;
    }
    this.renameError.set(null);
    this.store.renameColumn(column, name);
  }

  /** Whether another column already uses this name (case-insensitive). */
  private nameTaken(name: string, except: DatasetColumn | null): boolean {
    const lower = name.toLowerCase();
    return this.columns().some((c) => c !== except && c.name.toLowerCase() === lower);
  }

  protected retype(column: DatasetColumn, type: DatasetColumnType): void {
    this.store.retypeColumn(column, type);
  }

  /** Confirms before removing a column, since it drops that column's values from every row. */
  protected remove(column: DatasetColumn): void {
    this.dialog
      .open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Delete column',
          message: `Delete the "${column.name}" column? Its values will be removed from every row. This can't be undone.`,
          confirmLabel: 'Delete',
          danger: true,
        } satisfies ConfirmDialogData,
      })
      .closed.subscribe((confirmed) => {
        if (confirmed) this.store.deleteColumn(column);
      });
  }

  protected move(index: number, offset: number): void {
    this.store.moveColumn(index, offset);
  }
}
