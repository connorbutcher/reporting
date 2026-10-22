import { Type } from '@angular/core';

/** A panel component whose `static title` names it, readable for breadcrumbs without instantiating it. */
export type PanelComponentType = Type<unknown> & {
  readonly title: string;
};
