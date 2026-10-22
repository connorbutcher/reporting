import { WidgetConfigBase } from '../widget/widget-config-base.model';
import { TextFontWeight } from './text-font-weight.model';
import { TextAlign } from './text-align.model';
import { TextVerticalAlign } from './text-vertical-align.model';

export type StaticTextWidgetConfig = WidgetConfigBase & {
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
};
