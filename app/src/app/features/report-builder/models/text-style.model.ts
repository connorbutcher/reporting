import { signal } from '@angular/core';
import { TextAlign, TextFontWeight, TextVerticalAlign } from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { ValidationIssue } from './validation-issue';
import { TextStyleDto } from './text-style.dto';

export class TextStyleModel extends EditorNode {
  public readonly fontSize = signal(16);
  public readonly fontWeight = signal<TextFontWeight>('normal');
  public readonly italic = signal(false);
  public readonly underline = signal(false);
  public readonly strikethrough = signal(false);
  public readonly lineHeight = signal(1.4);
  public readonly color = signal('#1f2937');
  /** Null means transparent. */
  public readonly backgroundColor = signal<string | null>(null);
  public readonly textAlign = signal<TextAlign>('left');
  public readonly verticalAlign = signal<TextVerticalAlign>('top');
  public readonly wrap = signal(true);
  public readonly padding = signal(12);

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
  public setBackgroundEnabled(enabled: boolean, fallback = '#ffffff'): void {
    this.backgroundColor.set(enabled ? (this.backgroundColor() ?? fallback) : null);
  }

  public toDto(): TextStyleDto {
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

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return [];
  }

  // The panel clamps every value, so nothing needs rejecting here.
  public override ownIssues(): ValidationIssue[] {
    return [];
  }
}
