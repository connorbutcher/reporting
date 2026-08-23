import { Component, computed, input } from '@angular/core';
import { StaticTextWidgetConfig, TextFontWeight } from '../../../../core/models/report';

@Component({
  selector: 'app-static-text-widget',
  imports: [],
  templateUrl: './static-text-widget.component.html',
  styleUrl: './static-text-widget.component.scss',
})
export class StaticTextWidgetComponent {
  readonly config = input.required<StaticTextWidgetConfig>();

  protected readonly hasContent = computed(() => this.config().content.trim().length > 0);

  /**
   * Only the properties that actually vary go through the style binding;
   * layout structure stays in the stylesheet. Colours come from a native
   * `<input type="color">` in the side panel, which only ever yields a valid
   * `#rrggbb` value, so there is no free-text CSS to sanitise here.
   */
  protected readonly containerStyle = computed(() => {
    const c = this.config();
    return joinStyle({
      padding: `${c.padding}px`,
      background: c.backgroundColor ?? 'transparent',
      'justify-content': verticalAlignCss(c.verticalAlign),
      'overflow-x': c.wrap ? 'hidden' : 'auto',
    });
  });

  protected readonly contentStyle = computed(() => {
    const c = this.config();
    const decorations = [c.underline && 'underline', c.strikethrough && 'line-through']
      .filter(Boolean)
      .join(' ');

    return joinStyle({
      'font-size': `${c.fontSize}px`,
      'font-weight': String(fontWeightCss(c.fontWeight)),
      'font-style': c.italic ? 'italic' : 'normal',
      'text-decoration': decorations || 'none',
      'line-height': String(c.lineHeight),
      color: c.color,
      'text-align': c.textAlign,
      'white-space': c.wrap ? 'pre-wrap' : 'pre',
      'overflow-wrap': c.wrap ? 'break-word' : 'normal',
    });
  });
}

function fontWeightCss(weight: TextFontWeight): number {
  switch (weight) {
    case 'medium':
      return 500;
    case 'semibold':
      return 600;
    case 'bold':
      return 700;
    default:
      return 400;
  }
}

function verticalAlignCss(align: StaticTextWidgetConfig['verticalAlign']): string {
  switch (align) {
    case 'middle':
      return 'center';
    case 'bottom':
      return 'flex-end';
    default:
      return 'flex-start';
  }
}

function joinStyle(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}
