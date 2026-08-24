import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { form, required, validate } from '@angular/forms/signals';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatasetSource, DatasetSourceKey } from '../../../core/models/dataset';

export interface DatasetCreateDialogData {
  sources: DatasetSource[];
  /** The report's existing dataset names, so a duplicate is rejected inline. */
  existingNames: string[];
}

export interface DatasetCreateDialogResult {
  name: string;
  sourceId: number;
}

/** Icon shown for each source in the picker. */
const SOURCE_ICONS: Record<DatasetSourceKey, string> = {
  assembly: 'pi pi-sitemap',
  disassembly: 'pi pi-wrench',
  specification: 'pi pi-file-edit',
};

/** One-line explanation of what each source contributes, shown under the picker. */
const SOURCE_HINTS: Record<DatasetSourceKey, string> = {
  assembly: 'Build data — configured by type and the phases to include.',
  disassembly: 'Strip-down data — configured by type and the phases to include.',
  specification: 'Limits and reference values used for tolerance banding.',
};

/**
 * Collects a new dataset's name and source before it's created, mirroring the home page's
 * create dialog. Returns the chosen name + source id; the caller does the creation and then
 * opens the new dataset in the editor.
 *
 * The name + source are a signal {@link form}: the name input binds through the `[formField]`
 * directive and the required-name rule drives the Create button, so validity is declarative
 * rather than hand-rolled.
 */
@Component({
  selector: 'app-dataset-create-dialog',
  imports: [ButtonModule, InputTextModule],
  templateUrl: './dataset-create-dialog.component.html',
  styleUrl: './dataset-create-dialog.component.scss',
})
export class DatasetCreateDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(DialogRef<DatasetCreateDialogResult | undefined>);
  protected readonly data = inject<DatasetCreateDialogData>(DIALOG_DATA);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<DatasetCreateDialogResult>({
    name: '',
    sourceId: this.data.sources[0]?.id ?? 0,
  });

  // The name is a required, unique field. The duplicate check runs as a live
  // validator (against the report's existing names), so a clashing name disables
  // Create and shows a message as it's typed — before the dialog can close.
  protected readonly form = form(this.model, (path) => {
    required(path.name, { message: 'A dataset name is required.' });
    validate(path.name, ({ value }) => {
      const name = value().trim();
      const taken =
        !!name &&
        this.data.existingNames.some((existing) => existing.trim().toLowerCase() === name.toLowerCase());
      return taken ? { kind: 'duplicate', message: `A dataset called "${name}" already exists.` } : null;
    });
  });

  /** The duplicate-name message, shown as it's typed (never the plain "required"). */
  protected readonly nameError = computed(
    () => this.form.name().errors().find((e) => e.kind === 'duplicate')?.message ?? null,
  );

  ngAfterViewInit(): void {
    this.nameInput().nativeElement.focus();
  }

  protected icon(key: DatasetSourceKey): string {
    return SOURCE_ICONS[key];
  }

  protected hint(): string {
    const selected = this.data.sources.find((s) => s.id === this.form.sourceId().value());
    return selected ? SOURCE_HINTS[selected.key] : '';
  }

  protected selectSource(id: number): void {
    this.form.sourceId().value.set(id);
  }

  protected create(): void {
    const name = this.form.name().value().trim();
    if (!this.form().valid() || !name || !this.form.sourceId().value()) return;
    this.dialogRef.close({ name, sourceId: this.form.sourceId().value() });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
