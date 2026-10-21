import { PanelView } from '../panel-view';

/** The specific {@link PanelView} for one kind — e.g. `ViewOf<'columnSettings'>` carries `columnId`. */
export type ViewOf<K extends PanelView['kind']> = Extract<PanelView, { kind: K }>;
