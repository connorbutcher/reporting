import { Type } from '@angular/core';

/** A panel component whose `static title` names it, readable for breadcrumbs without instantiating it. */
export interface PanelComponentType extends Type<unknown> {
  readonly title: string;
}
