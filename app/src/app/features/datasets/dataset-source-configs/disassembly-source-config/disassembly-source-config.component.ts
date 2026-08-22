import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatasetsStore } from '../../datasets.store';

/**
 * Configuration editor for a disassembly-sourced dataset: the source-system type it draws from and
 * the phases to include. Self-contained — the source panel swaps it in when the source is disassembly.
 */
@Component({
  selector: 'app-disassembly-source-config',
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './disassembly-source-config.component.html',
  styleUrl: './disassembly-source-config.component.scss',
})
export class DisassemblySourceConfigComponent {
  private readonly store = inject(DatasetsStore);

  protected readonly newPhaseId = signal('');

  /** The config narrowed to assembly; null only during a brief source transition. */
  protected readonly config = computed(() => {
    const config = this.store.sourceConfig();
    return config && config.source === 'disassembly' ? config : null;
  });

  /** Commits the type id, treating a blank field as "not chosen". */
  protected setTypeId(value: string): void {
    const config = this.config();
    if (!config) return;
    const parsed = value.trim() === '' ? null : Number(value);
    const typeId = parsed !== null && Number.isInteger(parsed) ? parsed : null;
    this.store.updateSourceConfig({ ...config, typeId });
  }

  /** Adds a whole-number phase id, ignoring blanks, non-integers and duplicates. */
  protected addPhase(): void {
    const config = this.config();
    const raw = this.newPhaseId().trim();
    this.newPhaseId.set('');
    if (!config || raw === '') return;
    const id = Number(raw);
    if (!Number.isInteger(id) || config.phaseIds.includes(id)) return;
    this.store.updateSourceConfig({ ...config, phaseIds: [...config.phaseIds, id] });
  }

  protected removePhase(id: number): void {
    const config = this.config();
    if (!config) return;
    this.store.updateSourceConfig({ ...config, phaseIds: config.phaseIds.filter((p) => p !== id) });
  }
}
