import { Component, ElementRef, Signal, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DirectoryUser } from '../../../../core/models/admin';
import { WidgetComment, WidgetCommentAuthor } from '../../../../core/models/widget-comment.model';
import { ReportViewerStore } from '../../report-viewer.store';
import { ReportComments } from '../report-comments';

/** One run of a comment's body: plain text, or an `@name` mention rendered as a chip. */
interface CommentPart {
  text: string;
  isMention: boolean;
}

/** A thread comment with its body pre-split for rendering and its chart anchor, when it has one, pre-resolved. */
interface DisplayComment extends WidgetComment {
  parts: CommentPart[];
  anchor: { x: number; y: number; yAxisIndex?: number; label: string } | null;
  /** Whether this comment's own anchor is the one currently drawing attention — on the chart or the comment card alike. */
  isHighlighted: boolean;
}

/** Characters a regex would otherwise treat specially, escaped so a display name is matched literally. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits a comment body into plain-text and mention runs, for highlighting `@name` inline. */
function commentParts(body: string, mentions: readonly WidgetCommentAuthor[]): CommentPart[] {
  if (mentions.length === 0) {
    return [{ text: body, isMention: false }];
  }
  const tags = new Set(mentions.map((m) => `@${m.displayName}`));
  const pattern = new RegExp(`(${[...tags].map(escapeRegExp).join('|')})`, 'g');
  return body
    .split(pattern)
    .filter((s) => s.length > 0)
    .map((s) => ({ text: s, isMention: tags.has(s) }));
}

/**
 * The aside's Comments tab: the focused widget's thread, a composer with `@`-mention autocomplete,
 * and (when the thread has anchored comments) a chip per comment that hands the matching chart point
 * its highlight. The chart side of that pairing lives in `ChartWidgetComponent`; both read the shared
 * {@link ReportComments} highlight signal rather than talking to each other directly.
 */
@Component({
  selector: 'app-comments-panel',
  imports: [DatePipe],
  templateUrl: './comments-panel.component.html',
  styleUrl: './comments-panel.component.scss',
})
export class CommentsPanelComponent {
  public readonly comments = inject(ReportComments);
  public readonly widgetId: Signal<string | null>;
  public readonly widgetTitle: Signal<string | null>;
  public readonly thread: Signal<DisplayComment[]>;

  public readonly composerText = signal('');
  public readonly mentionedUsers = signal<WidgetCommentAuthor[]>([]);
  public readonly canPost: Signal<boolean>;
  public readonly mentionCandidates: Signal<DirectoryUser[]>;

  private readonly store = inject(ReportViewerStore);
  private readonly mentionQuery = signal<string | null>(null);
  private readonly composerInput = viewChild<ElementRef<HTMLTextAreaElement>>('composerInput');

  constructor() {
    this.widgetId = this.store.commentsWidgetId;
    this.widgetTitle = computed(() => {
      const id = this.widgetId();
      if (!id) {
        return null;
      }
      for (const tab of this.store.content()?.tabs ?? []) {
        const widget = tab.widgets.find((w) => w.id === id);
        if (widget) {
          return widget.config.title || widget.type;
        }
      }
      return null;
    });
    this.thread = computed(() => {
      const highlighted = this.comments.highlightedAnchor();
      const widgetId = this.widgetId();
      return this.comments.comments().map((c) => ({
        ...c,
        parts: commentParts(c.body, c.mentions),
        anchor:
          c.anchorX != null && c.anchorY != null
            ? {
                x: c.anchorX,
                y: c.anchorY,
                yAxisIndex: c.anchorYAxisIndex,
                label: this.anchorLabel(c.anchorX, c.anchorY),
              }
            : null,
        isHighlighted:
          highlighted != null &&
          highlighted.widgetId === widgetId &&
          highlighted.x === c.anchorX &&
          highlighted.y === c.anchorY,
      }));
    });
    this.canPost = computed(
      () => this.composerText().trim().length > 0 && !this.comments.posting(),
    );
    this.mentionCandidates = computed(() => {
      const query = this.mentionQuery();
      if (query == null) {
        return [];
      }
      const already = new Set(this.mentionedUsers().map((u) => u.id));
      return this.comments
        .directory()
        .filter(
          (u) => !already.has(u.id) && u.displayName.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 6);
    });
  }

  public onComposerInput(value: string): void {
    this.composerText.set(value);
    const match = /@([\w. ]*)$/.exec(value);
    this.mentionQuery.set(match ? match[1] : null);
  }

  public pickMention(user: DirectoryUser): void {
    const next = this.composerText().replace(/@([\w. ]*)$/, `@${user.displayName} `);
    this.composerText.set(next);
    this.mentionQuery.set(null);
    this.mentionedUsers.update((list) =>
      list.some((u) => u.id === user.id)
        ? list
        : [...list, { id: user.id, displayName: user.displayName }],
    );

    // Clicking a dropdown item moves focus to its button, so the textarea needs it back — and its
    // DOM value set directly, synchronously, rather than waiting for the `[value]` binding's own
    // change-detection pass: typing right after this click (as a reader finishing their sentence
    // normally would) must land after the mention it just inserted, not race it.
    const el = this.composerInput()?.nativeElement;
    if (!el) {
      return;
    }
    el.value = next;
    el.focus();
    el.setSelectionRange(next.length, next.length);
  }

  public clearAnchor(): void {
    this.comments.clearPendingAnchor();
  }

  public post(): void {
    if (!this.canPost()) {
      return;
    }
    this.comments.post(this.composerText(), this.mentionedUsers());
    this.composerText.set('');
    this.mentionQuery.set(null);
    this.mentionedUsers.set([]);
  }

  public remove(commentId: number): void {
    this.comments.remove(commentId);
  }

  public highlightAnchor(anchor: { x: number; y: number; yAxisIndex?: number }): void {
    const widgetId = this.widgetId();
    if (!widgetId) {
      return;
    }
    this.comments.highlight({ widgetId, ...anchor });
  }

  /** Up to two letters for an author's avatar, e.g. "M. Lindqvist" -> "ML". */
  public initials(displayName: string): string {
    const words = displayName.split(/[\s.]+/).filter(Boolean);
    const first = words[0]?.[0] ?? '';
    const second = words.length > 1 ? words[1][0] : '';
    return (first + second).toUpperCase();
  }

  private anchorLabel(x: number, y: number): string {
    return `${formatNumber(x)}, ${formatNumber(y)}`;
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
