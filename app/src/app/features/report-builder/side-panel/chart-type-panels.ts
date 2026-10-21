import { Type } from '@angular/core';
import { WidgetType } from '../../../core/models/report/index';

/**
 * A chart's type mapped to the panel component that edits one facet of it (its data
 * source, its appearance, …). Partial because only the chart types are ever keys — a
 * chart's `.type` is always one of them, so a miss means the map is simply incomplete.
 */
export type ChartTypePanels = Partial<Record<WidgetType, Type<unknown>>>;
