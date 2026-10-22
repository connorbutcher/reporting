import { PanelView } from '../panel-view';
import { PanelComponentType } from './panel-component-type';
import { ViewOf } from './view-of';

/** One side-panel screen: its component and its place in the breadcrumb hierarchy. */
export type PanelDescriptor<K extends PanelView['kind']> = {
  readonly component: PanelComponentType;
  /** The logical parent the breadcrumb walks, not back/forward history; null at the root. */
  readonly parent: (view: ViewOf<K>) => PanelView | null;
};
