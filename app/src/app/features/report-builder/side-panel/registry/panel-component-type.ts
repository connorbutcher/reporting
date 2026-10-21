import { Type } from '@angular/core';

/**
 * A panel component, carrying its own heading. The `static title` lives with the
 * component so each screen names itself; the chrome reads it for both the header
 * and the breadcrumb (which needs a label even for panels that aren't loaded, so
 * the title has to be readable off the class without instantiating it).
 */
export interface PanelComponentType extends Type<unknown> {
  readonly title: string;
}
