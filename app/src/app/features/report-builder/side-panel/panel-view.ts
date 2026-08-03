/** A single screen in the side panel's navigation history. */
export type PanelView =
  | { kind: 'root' }
  | { kind: 'report' }
  | { kind: 'widgets' }
  | { kind: 'widget'; widgetId: string }
  | { kind: 'widgetColumns'; widgetId: string }
  | { kind: 'addColumn'; widgetId: string }
  | { kind: 'columnSettings'; widgetId: string; columnId: string }
  | { kind: 'tableAppearance'; widgetId: string }
  | { kind: 'textStyle'; widgetId: string }
  | { kind: 'addWidget' }
  | { kind: 'issues' };
