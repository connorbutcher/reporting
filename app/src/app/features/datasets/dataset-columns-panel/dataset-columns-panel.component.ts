import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select, SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ColumnTypeImpact, DatasetColumn, DatasetColumnType } from '../../../core/models/dataset';
import { widgetFragment } from '../../../core/models/report';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../home/confirm-dialog/confirm-dialog.component';
import { DatasetsStore } from '../datasets.store';
import { describeUse, summariseUses, useDetails } from '../state/column-usage-display';

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

/**
 * The selected dataset's column schema: list, reorder, rename, retype and add. A column that
 * widgets in the report depend on says so, and lists them; deleting one spells out what it would break.
 */
@Component({
  selector: 'app-dataset-columns-panel',
  imports: [
    FormsModule,
    FormField,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
  ],
  templateUrl: './dataset-columns-panel.component.html',
  styleUrl: './dataset-columns-panel.component.scss',
})
export class DatasetColumnsPanelComponent {
  private readonly store = inject(DatasetsStore);
  private readonly dialog = inject(Dialog);
  private readonly route = inject(ActivatedRoute);

  /** The report this dataset belongs to, for the links back to the widgets that use a column. */
  protected readonly reportId = Number(this.route.snapshot.paramMap.get('reportId'));

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

  /** How each column is used in the report, by column id — empty for a column nothing uses. */
  protected readonly usageLines = computed(
    () => new Map(this.columns().map((c) => [c.id, this.store.columnUses(c.id).map(describeUse)])),
  );

  /** The columns whose usage list is open. */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  /** A message shown under the add row when a column rename is rejected as a duplicate. */
  protected readonly renameError = signal<string | null>(null);

  protected usageSummary(column: DatasetColumn): string {
    return summariseUses(this.store.columnUses(column.id));
  }

  protected toggleUsage(column: DatasetColumn): void {
    this.expanded.update((open) => {
      const next = new Set(open);
      if (!next.delete(column.id)) next.add(column.id);
      return next;
    });
  }

  /** The URL fragment that takes the builder straight to a widget. */
  protected fragmentFor(widgetId: string): string {
    return widgetFragment(widgetId);
  }

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

  /**
   * Changes a column's type — after asking what that would break. A change nothing depends on goes
   * straight through; one that would leave widgets with errors (a measure that needs a number, a
   * filter operator the new type lacks) is confirmed first, and cancelling puts the dropdown back.
   */
  protected retype(column: DatasetColumn, type: DatasetColumnType, select: Select): void {
    if (type === column.type) return;

    const check = this.store.columnTypeImpact(column.id, type);
    if (!check) return;

    // If the question can't be answered the change isn't blocked — it's confirmed, with that said.
    check.pipe(catchError(() => of(null))).subscribe((impact) => {
      if (impact && impact.breaks.length === 0) {
        this.store.retypeColumn(column, type);
        return;
      }

      this.dialog
        .open<boolean>(ConfirmDialogComponent, { data: this.typeChangeConfirmation(column, type, impact) })
        .closed.subscribe((confirmed) => {
          if (confirmed) this.store.retypeColumn(column, type);
          else select.writeValue(column.type);
        });
    });
  }

  private typeChangeConfirmation(
    column: DatasetColumn,
    type: DatasetColumnType,
    impact: ColumnTypeImpact | null,
  ): ConfirmDialogData {
    const change = `"${column.name}" from ${this.typeLabel(column.type)} to ${this.typeLabel(type)}`;

    if (!impact) {
      return {
        title: 'Change column type',
        message: `Change ${change}? We couldn't check whether widgets in this report depend on its type.`,
        confirmLabel: 'Change type',
        danger: true,
      };
    }

    const widgets = impact.breaks.filter((b) => b.kind === 'widget').length;
    const filter = impact.breaks.some((b) => b.kind === 'reportFilter');
    const what = [
      ...(widgets > 0 ? [`${widgets} widget${widgets === 1 ? '' : 's'}`] : []),
      ...(filter ? ['the report filter'] : []),
    ].join(' and ');

    return {
      title: 'Change would break widgets',
      message:
        `Changing ${change} will break ${what} in this report, which will show errors until you fix them. ` +
        `The column's values are re-read as the new type. Published versions of the report aren't affected.`,
      details: useDetails(impact.breaks),
      confirmLabel: 'Change anyway',
      danger: true,
    };
  }

  private typeLabel(type: DatasetColumnType): string {
    return COLUMN_TYPES.find((t) => t.value === type)?.label.toLowerCase() ?? type;
  }

  /**
   * Confirms before removing a column, since it drops that column's values from every row — and, if
   * widgets in the report use it, names them, because they'd be left with errors.
   */
  protected remove(column: DatasetColumn): void {
    this.dialog
      .open<boolean>(ConfirmDialogComponent, { data: this.deleteConfirmation(column) })
      .closed.subscribe((confirmed) => {
        if (confirmed) this.store.deleteColumn(column);
      });
  }

  private deleteConfirmation(column: DatasetColumn): ConfirmDialogData {
    const uses = this.store.columnUses(column.id);
    const removal = `Its values will be removed from every row. This can't be undone.`;

    if (uses.length > 0) {
      return {
        title: 'Delete a column that is in use',
        message:
          `"${column.name}" is ${this.usageSummary(column).toLowerCase()}. Deleting it will leave these with errors until you fix or remove them. ` +
          `${removal} Published versions of the report aren't affected.`,
        details: useDetails(uses),
        confirmLabel: 'Delete anyway',
        danger: true,
      };
    }

    // No uses found is only reassuring when the question was actually answered.
    const checked = this.store.columnUsageKnown()
      ? 'Nothing in this report uses it. '
      : "We couldn't check whether the report uses it. ";
    return {
      title: 'Delete column',
      message: `Delete the "${column.name}" column? ${checked}${removal}`,
      confirmLabel: 'Delete',
      danger: true,
    };
  }

  protected move(index: number, offset: number): void {
    this.store.moveColumn(index, offset);
  }
}
