import { WidgetConfigBase } from './widget-base.model';

export type TextFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';

export interface StaticTextWidgetConfig extends WidgetConfigBase {
  type: 'staticText';

  /** Plain text; line breaks are preserved, never rendered as HTML. */
  content: string;

  fontSize: number;
  fontWeight: TextFontWeight;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  lineHeight: number;

  color: string;
  /** Null means transparent. */
  backgroundColor: string | null;

  textAlign: TextAlign;
  verticalAlign: TextVerticalAlign;
  /** False lets long lines overflow with a scrollbar instead of wrapping. */
  wrap: boolean;
  padding: number;
}

export const DEFAULT_TEXT_CONFIG: Omit<StaticTextWidgetConfig, 'type'> = {
  title: 'Text',
  // The text itself is usually the whole point of the widget, so the extra
  // chrome bar stays off until the user asks for it.
  showTitle: false,
  content: '',
  fontSize: 16,
  fontWeight: 'normal',
  italic: false,
  underline: false,
  strikethrough: false,
  lineHeight: 1.4,
  color: '#1f2937',
  backgroundColor: null,
  textAlign: 'left',
  verticalAlign: 'top',
  wrap: true,
  padding: 12,
};
