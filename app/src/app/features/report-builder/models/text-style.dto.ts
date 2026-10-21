import { StaticTextWidgetConfig } from '../../../core/models/report';

/** How a text widget looks, separate from what it says. */
export type TextStyleDto = Omit<StaticTextWidgetConfig, 'type' | 'title' | 'showTitle' | 'content'>;
