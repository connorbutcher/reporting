import { Signal, computed, signal } from '@angular/core';
import { ValidationIssue } from './validation-issue';

/**
 * Base for every node in the report's editing model. Each node owns its state as signals, reports
 * its own issues and serialises itself; validity, dirtiness and issues roll up from its children.
 *
 * The hooks are methods, not fields: the computeds below are created while the base class
 * initialises, before subclass fields exist, but prototype methods are already there.
 */
export abstract class EditorNode {
  /** Issues raised by this node alone, not its children. */
  protected abstract ownIssues(): ValidationIssue[];

  protected abstract childNodes(): readonly EditorNode[];

  /** Compared against the last saved state to detect changes. */
  protected abstract snapshotValue(): unknown;

  private readonly pristine = signal<string | null>(null);

  /** The root overrides this with a memoized computed shared with the undo stack. */
  protected serialize(): string {
    return JSON.stringify(this.snapshotValue());
  }

  readonly issues: Signal<ValidationIssue[]> = computed(() => [
    ...this.ownIssues(),
    ...this.childNodes().flatMap((child) => child.issues()),
  ]);

  readonly errors = computed(() => this.issues().filter((issue) => issue.severity === 'error'));
  readonly warnings = computed(() => this.issues().filter((issue) => issue.severity === 'warning'));

  /** Only errors make a subtree invalid. */
  readonly isValid = computed(() => this.errors().length === 0);

  /** A parent's snapshot embeds its children's, so reverting an edit clears this again. */
  readonly dirty = computed(() => {
    const pristine = this.pristine();
    return pristine === null || this.serialize() !== pristine;
  });

  /** Accepts the current state as saved, for this node and everything below. */
  markPristine(): void {
    this.pristine.set(this.serialize());
    for (const child of this.childNodes()) child.markPristine();
  }
}
