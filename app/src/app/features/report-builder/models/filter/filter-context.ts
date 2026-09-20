import { Signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../../core/models/dataset';
import { OperatorCatalogue } from '../../../../core/models/filter';
import { PanelView } from '../../side-panel/panel-view';

/** What a filter node needs to describe itself and validate against. */
export interface FilterContext {
  /** The dataset being filtered, once its schema has loaded. */
  readonly schema: Signal<DatasetSchema | null>;
  readonly catalogue: Signal<OperatorCatalogue | null>;
  /** The columns this filter may test, when narrower than the dataset (a table offers only the columns it shows). */
  readonly columns?: Signal<DatasetColumn[]>;
  /** Columns with tolerance banding here: tolerance operators are offered only on these. */
  readonly tolerantColumns?: Signal<ReadonlySet<string>>;
  /** Where the builder navigates to fix a problem. Omitted in the viewer. */
  readonly view?: PanelView;
  /** Namespaces issue ids. */
  readonly ownerId: string;
  /** Ties an issue to its widget. */
  readonly widgetId?: string;
}
