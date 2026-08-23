import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatasetSource, DatasetSourceKey } from '../../../core/models/dataset';

export interface DatasetCreateDialogData {
  sources: DatasetSource[];
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
  imports: [FormField],
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

  protected readonly form = form(this.model, (path) => {
    required(path.name, { message: 'A dataset name is required.' });
  });

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
