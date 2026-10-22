import { Component, computed, inject, Signal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { FieldTree, form, FormField, required, validate } from '@angular/forms/signals';
import { Dialog } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select, SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ColumnTypeImpact, DatasetColumn, DatasetColumnType } from '../../../core/models/dataset';
import { WidgetFragment } from '../../../core/models/report';
import { ConfirmDialogComponent } from '../../home/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogData } from '../../home/confirm-dialog/confirm-dialog-data';
import { DatasetsStore } from '../datasets.store';
import { FormulaBuilderDialogComponent } from '../formula-builder-dialog/formula-builder-dialog.component';
import { FormulaBuilderData } from '../formula-builder-dialog/store/formula-builder-data';
import { ColumnUsageDisplay } from '../state/column-usage-display';

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
  private static readonly COLUMN_TYPES: { label: string; value: DatasetColumnType }[] = [
    { label: 'Text', value: 'string' },
    { label: 'Whole number', value: 'int' },
    { label: 'Decimal', value: 'double' },
    { label: 'Yes / No', value: 'bool' },
    { label: 'Date', value: 'dateTime' },
  ];

  private static readonly TYPE_ICONS: Record<DatasetColumnType, string> = {
    string: 'pi pi-align-left',
    int: 'pi pi-hashtag',
    double: 'pi pi-hashtag',
    bool: 'pi pi-check-square',
    dateTime: 'pi pi-calendar',
  };

  public readonly reportId: number;

  public readonly loading: Signal<boolean>;

  public readonly columnTypes = DatasetColumnsPanelComponent.COLUMN_TYPES;

  public readonly addForm: FieldTree<
    { name: string; type: DatasetColumnType },
    string | number,
    'writable'
  >;

  public readonly addNameError = computed(
    () =>
      this.addForm
        .name()
        .errors()
        .find((e) => e.kind === 'duplicate')?.message ?? null,
  );

  public readonly usageLines = computed(
    () =>
      new Map(
        this.columns().map((c) => [
          c.id,
          this.store.columnUses(c.id).map(ColumnUsageDisplay.describe),
        ]),
      ),
  );

  public readonly expanded = signal<ReadonlySet<string>>(new Set());

  public readonly renameError = signal<string | null>(null);

  private readonly store = inject(DatasetsStore);

  private readonly dialog = inject(Dialog);

  private readonly route = inject(ActivatedRoute);

  // The duplicate check is a live validator, so a clashing name disables Add as it's typed.
  private readonly draft = signal<{ name: string; type: DatasetColumnType }>({
    name: '',
    type: 'string',
  });

  constructor() {
    this.reportId = Number(this.route.snapshot.paramMap.get('reportId'));
    this.loading = this.store.schemaLoading;
    this.addForm = form(this.draft, (path) => {
      required(path.name, { message: 'A column name is required.' });
      validate(path.name, ({ value }) => {
        const name = value().trim();
        if (name && this.nameTaken(name, null)) {
          return { kind: 'duplicate', message: `A column named "${name}" already exists.` };
        }
        return null;
      });
    });
  }

  public usageSummary(column: DatasetColumn): string {
    return ColumnUsageDisplay.summarise(this.store.columnUses(column.id));
  }

  public toggleUsage(column: DatasetColumn): void {
    this.expanded.update((open) => {
      const next = new Set(open);
      if (!next.delete(column.id)) {
        next.add(column.id);
      }
      return next;
    });
  }

  public fragmentFor(widgetId: string): string {
    return WidgetFragment.forWidget(widgetId);
  }

  public typeIcon(type: DatasetColumnType): string {
    return DatasetColumnsPanelComponent.TYPE_ICONS[type];
  }

  public add(): void {
    if (!this.addForm().valid()) {
      return;
    }
    const { name, type } = this.addForm().value();
    this.store.addColumn(name.trim(), type);
    this.addForm.name().value.set('');
  }

  /** Restores the field if the name is blank or a duplicate. */
  public onRenameBlur(column: DatasetColumn, event: Event): void {
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

  /**
   * Asks what the change would break and confirms when widgets would be left with errors;
   * cancelling restores the dropdown.
   */
  public retype(column: DatasetColumn, type: DatasetColumnType, select: Select): void {
    if (type === column.type) {
      return;
    }

    const check = this.store.columnTypeImpact(column.id, type);
    if (!check) {
      return;
    }

    check.pipe(catchError(() => of(null))).subscribe((impact) => {
      if (impact && impact.breaks.length === 0) {
        this.store.retypeColumn(column, type);
        return;
      }

      this.dialog
        .open<boolean>(ConfirmDialogComponent, {
          data: this.typeChangeConfirmation(column, type, impact),
        })
        .closed.subscribe((confirmed) => {
          if (confirmed) {
            this.store.retypeColumn(column, type);
          } else {
            select.writeValue(column.type);
          }
        });
    });
  }

  /** Confirms the delete, naming any widgets that use the column. */
  public remove(column: DatasetColumn): void {
    this.dialog
      .open<boolean>(ConfirmDialogComponent, { data: this.deleteConfirmation(column) })
      .closed.subscribe((confirmed) => {
        if (confirmed) {
          this.store.deleteColumn(column);
        }
      });
  }

  public openFormulaBuilder(column: DatasetColumn | null): void {
    const datasetId = this.store.selectedId();
    if (datasetId === null) {
      return;
    }

    this.dialog
      .open<DatasetColumn | undefined, FormulaBuilderData>(FormulaBuilderDialogComponent, {
        data: { datasetId, columns: this.columns(), column },
        ariaLabel: 'Formula builder',
        autoFocus: 'dialog',
      })
      .closed.subscribe((saved) => {
        if (saved) {
          this.store.applyFormulaColumnSaved(saved);
        }
      });
  }

  public move(index: number, offset: number): void {
    this.store.moveColumn(index, offset);
  }

  public get columns() {
    return this.store.columns;
  }

  public get isFiltered() {
    return this.store.isFiltered;
  }

  private nameTaken(name: string, except: DatasetColumn | null): boolean {
    const lower = name.toLowerCase();
    return this.columns().some((c) => c !== except && c.name.toLowerCase() === lower);
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

    const what = ColumnUsageDisplay.where(impact.breaks);

    return {
      title: 'Change would break widgets',
      message:
        `Changing ${change} will break ${what} in this report, which will show errors until you fix them. ` +
        `The column's values are re-read as the new type. Published versions of the report aren't affected.`,
      details: ColumnUsageDisplay.details(impact.breaks),
      confirmLabel: 'Change anyway',
      danger: true,
    };
  }

  private typeLabel(type: DatasetColumnType): string {
    return (
      DatasetColumnsPanelComponent.COLUMN_TYPES.find(
        (t) => t.value === type,
      )?.label.toLowerCase() ?? type
    );
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
        details: ColumnUsageDisplay.details(uses),
        confirmLabel: 'Delete anyway',
        danger: true,
      };
    }

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
}
