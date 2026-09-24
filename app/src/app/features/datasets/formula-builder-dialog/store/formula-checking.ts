import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { FormulaApiService } from '../../../../core/api/formula-api.service';
import { FormulaPreview } from '../../../../core/models/dataset';
import { FormulaIssue, analyzeFormula, blockAtPosition, describeSlot, serializeFormula } from '../model';
import { FormulaBuilderData } from './formula-builder-data';
import { FormulaCatalogue } from './formula-catalogue';
import { FormulaColumnForm } from './formula-column-form';
import { FormulaDocument } from './formula-document';
import { PreviewOutcome } from './preview-outcome';
import { PreviewRequest } from './preview-request';

const PREVIEW_ROWS = 5;
const PREVIEW_DEBOUNCE_MS = 300;

/**
 * The checks that run as the formula changes: locally for structure and types, and on the server (debounced)
 * for the authoritative verdict and a preview of the results.
 */
@Injectable()
export class FormulaChecking {
  public readonly serialized = computed(() => {
    const scope = this.catalogue.scope();
    return serializeFormula(this.document.root(), (call, index) => describeSlot(scope, call, index));
  });

  /** What can be told without the server: the kind the formula produces, and the problems in how it fits together. */
  public readonly analysis = computed(() => analyzeFormula(this.document.root(), this.catalogue.scope()));

  public readonly localIssues = computed(() => this.analysis().issues);

  public readonly preview = signal<FormulaPreview | null>(null);
  public readonly previewing = signal(false);
  public readonly previewFailed = signal(false);

  /** Every problem with the formula: the local ones, then — once those are cleared — the server's. */
  public readonly issues = computed(() => [...this.localIssues(), ...this.serverIssues()]);

  /** Each item's own problems, by item id — for marking it, and listing them under its expression. */
  public readonly blockIssues = computed(() => {
    const byBlock = new Map<number, FormulaIssue[]>();
    for (const issue of this.issues()) {
      if (issue.kind !== 'missing') {
        this.addTo(byBlock, issue.blockId, issue);
      }
    }

    return byBlock;
  });

  /** Problems with a function's argument as a whole (empty, or the wrong kind), keyed `functionId:argIndex`. */
  public readonly argumentIssues = computed(() => {
    const byArgument = new Map<string, FormulaIssue[]>();
    for (const issue of this.issues()) {
      if (issue.ownerId !== undefined && issue.arg !== undefined) {
        this.addTo(byArgument, `${issue.ownerId}:${issue.arg}`, issue);
      }
    }

    return byArgument;
  });

  /** The kind of value the formula produces; `any` when it can't be told or there is no formula. */
  public readonly resultKind = computed(() => this.analysis().kind);

  /** True when the formula is complete and the server has passed it. */
  public readonly isValid = computed(() => {
    return this.document.root().length > 0 && this.issues().length === 0 && this.preview()?.isValid === true;
  });

  private readonly serverIssues = signal<FormulaIssue[]>([]);
  private readonly data = inject<FormulaBuilderData>(DIALOG_DATA);
  private readonly api = inject(FormulaApiService);
  private readonly document = inject(FormulaDocument);
  private readonly catalogue = inject(FormulaCatalogue);
  private readonly columnForm = inject(FormulaColumnForm);
  private readonly previewRequests = new Subject<PreviewRequest | null>();

  constructor() {
    // Ask the server only about a formula that is complete and locally sound; anything else has nothing for it to add.
    effect(() => {
      const serialized = this.serialized();
      const runnable = this.document.root().length > 0 && serialized.complete && this.localIssues().length === 0;
      this.previewing.set(runnable);
      this.previewRequests.next(runnable ? { text: serialized.text, type: this.columnForm.typeToSend() } : null);
    });

    this.previewRequests
      .pipe(
        debounceTime(PREVIEW_DEBOUNCE_MS),
        switchMap((request) => this.fetchPreview(request)),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => {
        this.accept(outcome);
      });
  }

  private fetchPreview(request: PreviewRequest | null): Observable<PreviewOutcome> {
    if (request === null) {
      return of({ request, preview: null, failed: false });
    }

    return this.api.preview(this.data.datasetId, { expression: request.text, type: request.type, sampleSize: PREVIEW_ROWS }).pipe(
      map((preview): PreviewOutcome => ({ request, preview, failed: false })),
      catchError(() => of<PreviewOutcome>({ request, preview: null, failed: true })),
    );
  }

  private accept(outcome: PreviewOutcome): void {
    const { request, preview, failed } = outcome;

    // A newer edit has already superseded this answer.
    if (request && request.text !== this.serialized().text) {
      return;
    }

    this.previewing.set(false);
    this.previewFailed.set(failed);
    this.preview.set(preview);
    this.serverIssues.set(preview && !preview.isValid ? this.placeServerErrors(preview) : []);
  }

  /** Puts each server error on the innermost block whose text contains it. */
  private placeServerErrors(preview: FormulaPreview): FormulaIssue[] {
    const { spans } = this.serialized();
    const rootId = this.document.root()[0]?.id ?? 0;

    return preview.errors.map((error): FormulaIssue => {
      return { kind: 'server', blockId: blockAtPosition(spans, error.position) ?? rootId, message: error.message };
    });
  }

  private addTo<K>(groups: Map<K, FormulaIssue[]>, key: K, issue: FormulaIssue): void {
    const group = groups.get(key);
    if (group) {
      group.push(issue);
    } else {
      groups.set(key, [issue]);
    }
  }
}
