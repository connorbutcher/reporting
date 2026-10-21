import { signal } from '@angular/core';
import {
  DEFAULT_TEXT_CONFIG,
  StaticTextWidget,
  StaticTextWidgetConfig,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { TextStyleModel } from './text-style.model';
import { ValidationIssue } from './validation-issue';
import { WidgetModel } from './widget-model-base';

export class StaticTextWidgetModel extends WidgetModel {
  public override readonly type = 'staticText' as const;
  public readonly content = signal('');
  public readonly style: TextStyleModel;

  constructor(widget: StaticTextWidget) {
    super(widget);
    this.content.set(widget.config.content);
    this.style = new TextStyleModel(widget.config);
  }

  public override toDto(): StaticTextWidget {
    const config: StaticTextWidgetConfig = {
      type: 'staticText',
      ...DEFAULT_TEXT_CONFIG,
      ...this.baseConfigDto(),
      ...this.style.toDto(),
      content: this.content(),
    };
    return { ...this.geometryDto(), type: 'staticText', config };
  }

  public override defaultTitle(): string {
    return 'Text';
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.style];
  }

  public override ownIssues(): ValidationIssue[] {
    if (this.content().trim().length > 0) return [];

    return [
      {
        id: `${this.id}:noContent`,
        severity: 'warning',
        title: `${this.label()} has no text`,
        detail: 'Add the text this widget should show.',
        widgetId: this.id,
        view: { kind: 'widget', widgetId: this.id },
      },
    ];
  }
}
