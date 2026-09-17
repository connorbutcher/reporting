import { Signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../../core/models/dataset';
import { OperatorCatalogue } from '../../../../core/models/filter';
import { PanelView } from '../../side-panel/panel-view';

/** Everything a filter node needs to describe itself and validate against. */
export interface FilterContext {
  /** The dataset being filtered, once its schema has loaded. */
  readonly schema: Signal<DatasetSchema | null>;
  /** Operators per column type, once fetched. */
  readonly catalogue: Signal<OperatorCatalogue | null>;
  /**
   * The columns this filter may test, when narrower than the whole dataset — a
   * table's filter offers only the columns it shows. Omitted for page-level
   * filters, which span every column.
   */
  readonly columns?: Signal<DatasetColumn[]>;
  /**
   * Columns (by id) with tolerance banding in this context, so the tolerance
   * operators are offered only where there's a band to test against.
   */
  readonly tolerantColumns?: Signal<ReadonlySet<string>>;
  /** Where the builder's panel should navigate to fix a problem here. Omitted in the viewer. */
  readonly view?: PanelView;
  /** Namespaces issue ids, and ties widget-level issues to their widget. */
  readonly ownerId: string;
  readonly widgetId?: string;
}
