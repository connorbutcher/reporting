import { Signal, computed, signal } from '@angular/core';
import { ValidationIssue } from './validation-issue';

/**
 * Base for every node in the report's editing model.
 *
 * Each node owns its own slice of state as signals, reports the problems it
 * knows about, and can serialise itself. Everything a caller usually cares
 * about — is this valid, does it have unsaved changes, what are the problems —
 * is aggregated from the node plus its descendants, so asking the root gives
 * the state of the whole report.
 *
 * Subclasses implement the three hooks as *methods* rather than fields: methods
 * live on the prototype and so are safe to reference from the computeds below,
 * which are created while the base class initialises (before subclass fields).
 */
export abstract class EditorNode {
  /** Problems raised by this node alone, not counting its children. */
  protected abstract ownIssues(): ValidationIssue[];

  /** Child nodes whose state rolls up into this one. */
  protected abstract childNodes(): readonly EditorNode[];

  /** The value compared against the last saved state to detect changes. */
  protected abstract snapshotValue(): unknown;

  private readonly pristine = signal<string | null>(null);

  /**
   * This node's state as a comparable string. Defaults to serializing the
   * snapshot; the root overrides it with a memoized computed so the whole-report
   * serialization runs once per change and is shared with the undo stack.
   */
  protected serialize(): string {
    return JSON.stringify(this.snapshotValue());
  }

  /** This node's problems plus everything below it. */
  readonly issues: Signal<ValidationIssue[]> = computed(() => [
    ...this.ownIssues(),
    ...this.childNodes().flatMap((child) => child.issues()),
  ]);

  readonly errors = computed(() => this.issues().filter((issue) => issue.severity === 'error'));
  readonly warnings = computed(() => this.issues().filter((issue) => issue.severity === 'warning'));

  /** Warnings are tolerated; only errors make a subtree invalid. */
  readonly isValid = computed(() => this.errors().length === 0);

  /**
   * True when this subtree differs from the last saved state. A parent's
   * snapshot embeds its children's, so the root is dirty whenever anything
   * anywhere changed — and reverting an edit clears it again.
   */
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
