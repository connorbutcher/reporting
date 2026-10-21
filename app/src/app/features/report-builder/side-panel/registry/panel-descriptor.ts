import { PanelView } from '../panel-view';
import { PanelComponentType } from './panel-component-type';
import { ViewOf } from './view-of';

/**
 * Everything the panel chrome needs to know about one screen, in a single row:
 * which component renders it, and where it sits in the breadcrumb hierarchy.
 * The heading isn't here — each component names itself through its `static title`.
 */
export interface PanelDescriptor<K extends PanelView['kind']> {
  readonly component: PanelComponentType;
  /**
   * The view one step up the panel's *logical* hierarchy — what the breadcrumb
   * walks — or null at the root. Deliberately independent of chronological
   * back/forward history, which can jump sideways between unrelated screens;
   * this always answers "what is this screen part of", not "what did I see last".
   */
  readonly parent: (view: ViewOf<K>) => PanelView | null;
}
