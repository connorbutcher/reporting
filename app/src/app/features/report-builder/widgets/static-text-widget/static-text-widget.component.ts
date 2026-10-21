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

  /** Colours come from a native colour input, which only yields `#rrggbb`, so nothing needs sanitising. */
  protected readonly containerStyle = computed(() => {
    const c = this.config();
    return StaticTextWidgetComponent.joinStyle({
      padding: `${c.padding}px`,
      background: c.backgroundColor ?? 'transparent',
      'justify-content': StaticTextWidgetComponent.verticalAlignCss(c.verticalAlign),
      'overflow-x': c.wrap ? 'hidden' : 'auto',
    });
  });

  protected readonly contentStyle = computed(() => {
    const c = this.config();
    const decorations = [c.underline && 'underline', c.strikethrough && 'line-through']
      .filter(Boolean)
      .join(' ');

    return StaticTextWidgetComponent.joinStyle({
      'font-size': `${c.fontSize}px`,
      'font-weight': String(StaticTextWidgetComponent.fontWeightCss(c.fontWeight)),
      'font-style': c.italic ? 'italic' : 'normal',
      'text-decoration': decorations || 'none',
      'line-height': String(c.lineHeight),
      color: c.color,
      'text-align': c.textAlign,
      'white-space': c.wrap ? 'pre-wrap' : 'pre',
      'overflow-wrap': c.wrap ? 'break-word' : 'normal',
    });
  });

  private static fontWeightCss(weight: TextFontWeight): number {
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

  private static verticalAlignCss(align: StaticTextWidgetConfig['verticalAlign']): string {
    switch (align) {
      case 'middle':
        return 'center';
      case 'bottom':
        return 'flex-end';
      default:
        return 'flex-start';
    }
  }

  private static joinStyle(props: Record<string, string>): string {
    return Object.entries(props)
      .map(([key, value]) => `${key}:${value}`)
      .join(';');
  }
}
