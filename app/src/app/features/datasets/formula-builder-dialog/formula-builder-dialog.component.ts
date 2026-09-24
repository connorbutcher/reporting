import { Component, computed, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatasetColumnType } from '../../../core/models/dataset';
import { FormulaBuilderStore } from './formula-builder.store';
import { FormulaCanvasComponent } from './formula-canvas/formula-canvas.component';
import { FormulaPaletteComponent } from './formula-palette/formula-palette.component';
import { FormulaPreviewComponent } from './formula-preview/formula-preview.component';
import { FormulaProblemsComponent } from './formula-problems/formula-problems.component';
import { FormulaReadoutComponent } from './formula-readout/formula-readout.component';
import { KIND_LABELS } from './model';
import { FormulaCatalogue } from './store/formula-catalogue';
import { FormulaChecking } from './store/formula-checking';
import { FormulaColumnForm } from './store/formula-column-form';
import { FormulaDocument } from './store/formula-document';
import { FormulaEditing } from './store/formula-editing';
import { FormulaInteraction } from './store/formula-interaction';
import { FormulaLoader } from './store/formula-loader';
import { FormulaSaver } from './store/formula-saver';
import { FormulaSelection } from './store/formula-selection';

const TYPE_OPTIONS: { label: string; value: DatasetColumnType | 'auto' }[] = [
  { label: 'Automatic', value: 'auto' },
  { label: 'Text', value: 'string' },
  { label: 'Whole number', value: 'int' },
  { label: 'Decimal', value: 'double' },
  { label: 'Yes / No', value: 'bool' },
  { label: 'Date', value: 'dateTime' },
];

const TYPE_NAMES: Record<DatasetColumnType, string> = {
  string: 'text',
  int: 'a whole number',
  double: 'a number',
  bool: 'yes / no',
  dateTime: 'a date',
};

/**
 * Builds a formula column: lay out columns, values, functions and bare operator symbols in a row — and inside
 * the arguments of functions and in brackets — while the formula reads back as text, problems are
 * flagged on the block that caused them, and the server previews the results. All the state is in
 * {@link FormulaBuilderStore}, which this dialog provides for the panels inside it to share.
 */
@Component({
  selector: 'app-formula-builder-dialog',
  imports: [
    FormsModule,
    FormField,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FormulaPaletteComponent,
    FormulaCanvasComponent,
    FormulaReadoutComponent,
    FormulaProblemsComponent,
    FormulaPreviewComponent,
  ],
  providers: [
    FormulaDocument,
    FormulaCatalogue,
    FormulaColumnForm,
    FormulaInteraction,
    FormulaChecking,
    FormulaSelection,
    FormulaEditing,
    FormulaSaver,
    FormulaLoader,
    FormulaBuilderStore,
  ],
  templateUrl: './formula-builder-dialog.component.html',
  styleUrl: './formula-builder-dialog.component.scss',
  host: {
    role: 'dialog',
    'aria-label': 'Formula builder',
    // Focusable, so a click on an item leaves focus in the dialog and its shortcuts (copy, paste, delete) keep working.
    tabindex: '-1',
    '(keydown)': 'onKeydown($event)',
  },
})
export class FormulaBuilderDialogComponent {
  public readonly typeOptions = TYPE_OPTIONS;

  public readonly canUndo = computed(() => this.store.canUndo());
  public readonly canRedo = computed(() => this.store.canRedo());
  public readonly saving = computed(() => this.store.saving());
  public readonly canPaste = computed(() => this.store.clipboard().length > 0);
  public readonly editing = computed(() => this.store.data.column !== null);

  public readonly nameTouched = computed(() => this.store.nameForm.name().touched());

  public readonly nameError = computed(() => {
    const name = this.store.nameForm.name();
    return name.touched() ? (name.errors()[0]?.message ?? null) : null;
  });

  /** The chosen type, for the select. */
  public readonly chosenType = computed(() => this.store.chosenType());

  /** "Result: a number" — what the formula will produce, or why that isn't known yet. */
  public readonly resultText = computed(() => {
    if (this.store.root().length === 0) {
      return 'Result: not set yet';
    }
    const type = this.store.resultType();
    if (type) {
      return `Result: ${TYPE_NAMES[type]}`;
    }
    return `Result: ${KIND_LABELS[this.store.resultKind()]} — choose a type`;
  });

  public readonly status = computed<{ tone: 'idle' | 'ok' | 'bad' | 'busy'; text: string }>(() => {
    const issues = this.store.issues().length;
    if (this.store.root().length === 0) {
      return { tone: 'idle', text: 'Empty' };
    }
    if (issues > 0) {
      return { tone: 'bad', text: `${issues} problem${issues === 1 ? '' : 's'}` };
    }
    if (!this.store.serialized().complete) {
      return { tone: 'idle', text: 'Unfinished' };
    }
    if (this.store.previewing()) {
      return { tone: 'busy', text: 'Checking…' };
    }
    return this.store.isValid() ? { tone: 'ok', text: 'Valid' } : { tone: 'idle', text: 'Not checked' };
  });

  private readonly store = inject(FormulaBuilderStore);

  public setType(type: DatasetColumnType | 'auto'): void {
    this.store.chosenType.set(type);
  }

  public undo(): void {
    this.store.undo();
  }

  public redo(): void {
    this.store.redo();
  }

  public paste(): void {
    this.store.paste();
  }

  public clear(): void {
    this.store.clear();
  }

  public save(): void {
    this.store.save();
  }

  public cancel(): void {
    this.store.cancel();
  }

  /**
   * Shortcuts, when the keyboard isn't in a text box: Ctrl+Z / Ctrl+Y undo and redo; Ctrl+C / Ctrl+V copy
   * and paste the selected items; Delete removes them; "(" puts them in brackets; Escape lets go of the selection.
   */
  public onKeydown(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).matches('input, textarea, [contenteditable]')) {
      return;
    }

    const key = event.key.toLowerCase();
    const handled = event.ctrlKey || event.metaKey ? this.onModifiedKey(key, event.shiftKey) : this.onSelectionKey(key, event);
    if (handled) {
      event.preventDefault();
    }
  }

  /** The name field, for the signal form binding. */
  public get nameForm(): FormulaBuilderStore['nameForm'] {
    return this.store.nameForm;
  }

  /** Undo, redo, copy and paste. Returns whether the key was used. */
  private onModifiedKey(key: string, shift: boolean): boolean {
    if (key === 'z') {
      if (shift) {
        this.store.redo();
      } else {
        this.store.undo();
      }

      return true;
    }

    if (key === 'y') {
      this.store.redo();
      return true;
    }

    if (key === 'c' && this.store.selectionRange()) {
      this.store.copySelection();
      return true;
    }

    if (key === 'v' && this.canPaste()) {
      this.store.paste();
      return true;
    }

    return false;
  }

  /** Delete, brackets and letting go, all of which need something selected. Returns whether the key was used. */
  private onSelectionKey(key: string, event: KeyboardEvent): boolean {
    if (!this.store.selectionRange()) {
      return false;
    }

    if (key === 'escape') {
      event.stopPropagation(); // let go of the selection rather than closing the dialog
      this.store.clearSelection();
      return true;
    }

    if (key === 'delete' || key === 'backspace') {
      this.store.deleteSelection();
      return true;
    }

    if (key === '(') {
      this.store.wrapSelectionInBrackets();
      return true;
    }

    return false;
  }
}
