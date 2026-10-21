import { PanelView } from './panel-view';

/** One breadcrumb: an ancestor view, or the ellipsis standing in for collapsed ancestors. */
export type Crumb = PanelView | 'ellipsis';
