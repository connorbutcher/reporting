/** A single screen in the side panel's navigation history. */
export type PanelView =
  | { kind: 'root' }
  | { kind: 'report' }
  | { kind: 'widgets' }
  | { kind: 'widget'; widgetId: string }
  | { kind: 'widgetColumns'; widgetId: string }
  | { kind: 'addColumn'; widgetId: string }
  | { kind: 'columnSettings'; widgetId: string; columnId: string }
  | { kind: 'columnTolerance'; widgetId: string; columnId: string }
  | { kind: 'chartToleranceBand'; widgetId: string; bandId: string }
  | { kind: 'tableAppearance'; widgetId: string }
  | { kind: 'textStyle'; widgetId: string }
  | { kind: 'widgetFilters'; widgetId: string; bindingId?: string }
  | { kind: 'reportFilters' }
  | { kind: 'addWidget' }
  | { kind: 'issues' };
