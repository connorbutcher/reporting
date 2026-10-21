import { Type } from '@angular/core';
import { WidgetType } from '../../../core/models/report';

/** A chart type's panel for one facet (source, appearance, …). Partial because only chart types are keys. */
export type ChartTypePanels = Partial<Record<WidgetType, Type<unknown>>>;
