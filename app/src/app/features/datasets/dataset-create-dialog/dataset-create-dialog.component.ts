import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatasetSourceKey } from '../../../core/models/dataset';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatasetCreateDialogResult } from './dataset-create-dialog-result';
import { DatasetCreateDialogData } from './dataset-create-dialog-data';
import { FieldTree, form, required, validate } from '@angular/forms/signals';

@Component({
  selector: 'app-dataset-create-dialog',
  imports: [ButtonModule, InputTextModule],
  templateUrl: './dataset-create-dialog.component.html',
  styleUrl: './dataset-create-dialog.component.scss',
})
export class DatasetCreateDialogComponent implements AfterViewInit {
  /** Icon shown for each source in the picker. */
  private static readonly SOURCE_ICONS: Record<DatasetSourceKey, string> = {
    assembly: 'pi pi-sitemap',
    disassembly: 'pi pi-wrench',
    specification: 'pi pi-file-edit',
    filtered: 'pi pi-filter',
  };

  /** One-line explanation of what each source contributes, shown under the picker. */
  private static readonly SOURCE_HINTS: Record<DatasetSourceKey, string> = {
    assembly: 'Build data — configured by type and the phases to include.',
    disassembly: 'Strip-down data — configured by type and the phases to include.',
    specification: 'Limits and reference values used for tolerance banding.',
    filtered:
      'A subset of another dataset — pick the base dataset and build the filter after it’s created.',
  };

  public readonly data = inject<DatasetCreateDialogData>(DIALOG_DATA);

  // The duplicate check is a live validator, so a clashing name disables Create as it's typed.
  public readonly form: FieldTree<DatasetCreateDialogResult, string | number, 'writable'>;

  /** The duplicate-name message, shown as it's typed (never the plain "required"). */
  public readonly nameError = computed(
    () =>
      this.form
        .name()
        .errors()
        .find((e) => e.kind === 'duplicate')?.message ?? null,
  );

  private readonly dialogRef = inject(DialogRef<DatasetCreateDialogResult | undefined>);

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<DatasetCreateDialogResult>({
    name: '',
    sourceId: this.data.sources[0]?.id ?? 0,
  });

  constructor() {
    this.form = form(this.model, (path) => {
      required(path.name, { message: 'A dataset name is required.' });
      validate(path.name, ({ value }) => {
        const name = value().trim();
        const taken =
          !!name &&
          this.data.existingNames.some(
            (existing) => existing.trim().toLowerCase() === name.toLowerCase(),
          );
        return taken
          ? { kind: 'duplicate', message: `A dataset called "${name}" already exists.` }
          : null;
      });
    });
  }

  public ngAfterViewInit(): void {
    this.nameInput().nativeElement.focus();
  }

  public icon(key: DatasetSourceKey): string {
    return DatasetCreateDialogComponent.SOURCE_ICONS[key];
  }

  public hint(): string {
    const selected = this.data.sources.find((s) => s.id === this.form.sourceId().value());
    return selected ? DatasetCreateDialogComponent.SOURCE_HINTS[selected.key] : '';
  }

  public selectSource(id: number): void {
    this.form.sourceId().value.set(id);
  }

  public create(): void {
    const name = this.form.name().value().trim();
    if (!this.form().valid() || !name || !this.form.sourceId().value()) {
      return;
    }
    this.dialogRef.close({ name, sourceId: this.form.sourceId().value() });
  }

  public cancel(): void {
    this.dialogRef.close();
  }
}
