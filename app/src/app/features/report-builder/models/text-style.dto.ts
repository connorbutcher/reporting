import { StaticTextWidgetConfig } from '../../../core/models/report/index';

/** Everything about how a text widget looks, separate from what it says. */
export type TextStyleDto = Omit<StaticTextWidgetConfig, 'type' | 'title' | 'showTitle' | 'content'>;
