import { signal } from '@angular/core';
import {
  StaticTextWidgetConfig,
  TextAlign,
  TextFontWeight,
  TextVerticalAlign,
} from '../../../core/models/report.model';
import { EditorNode } from './editor-node';
import { ValidationIssue } from './validation-issue';

/** Everything about how a text widget looks, separate from what it says. */
export type TextStyleDto = Omit<StaticTextWidgetConfig, 'type' | 'title' | 'showTitle' | 'content'>;

export class TextStyleModel extends EditorNode {
  readonly fontSize = signal(16);
  readonly fontWeight = signal<TextFontWeight>('normal');
  readonly italic = signal(false);
  readonly underline = signal(false);
  readonly strikethrough = signal(false);
  readonly lineHeight = signal(1.4);
  readonly color = signal('#1f2937');
  /** Null means transparent. */
  readonly backgroundColor = signal<string | null>(null);
  readonly textAlign = signal<TextAlign>('left');
  readonly verticalAlign = signal<TextVerticalAlign>('top');
  readonly wrap = signal(true);
  readonly padding = signal(12);

  constructor(dto: TextStyleDto) {
    super();
    this.fontSize.set(dto.fontSize);
    this.fontWeight.set(dto.fontWeight);
    this.italic.set(dto.italic);
    this.underline.set(dto.underline);
    this.strikethrough.set(dto.strikethrough);
    this.lineHeight.set(dto.lineHeight);
    this.color.set(dto.color);
    this.backgroundColor.set(dto.backgroundColor);
    this.textAlign.set(dto.textAlign);
    this.verticalAlign.set(dto.verticalAlign);
    this.wrap.set(dto.wrap);
    this.padding.set(dto.padding);
  }

  /** Turning the background on needs a colour to start from. */
  setBackgroundEnabled(enabled: boolean, fallback = '#ffffff'): void {
    this.backgroundColor.set(enabled ? (this.backgroundColor() ?? fallback) : null);
  }

  toDto(): TextStyleDto {
    return {
      fontSize: this.fontSize(),
      fontWeight: this.fontWeight(),
      italic: this.italic(),
      underline: this.underline(),
      strikethrough: this.strikethrough(),
      lineHeight: this.lineHeight(),
      color: this.color(),
      backgroundColor: this.backgroundColor(),
      textAlign: this.textAlign(),
      verticalAlign: this.verticalAlign(),
      wrap: this.wrap(),
      padding: this.padding(),
    };
  }

  protected override snapshotValue(): unknown {
    return this.toDto();
  }

  protected override childNodes(): readonly EditorNode[] {
    return [];
  }

  /** The panel clamps every one of these, so there is nothing to reject here. */
  protected override ownIssues(): ValidationIssue[] {
    return [];
  }
}
