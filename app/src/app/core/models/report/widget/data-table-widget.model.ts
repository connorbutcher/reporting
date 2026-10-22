import { WidgetBase } from './widget-base.model';
import { DataTableWidgetConfig } from '../table/data-table-widget-config.model';

/**
 * A discriminated union on `type`, so narrowing `type` also narrows `config`
 * to the matching shape (e.g. inside a `switch (widget.type)` or after a
 * `widget.type === 'dataTable'` check).
 */
export type DataTableWidget = WidgetBase & {
  type: 'dataTable';
  config: DataTableWidgetConfig;
};
