const WIDGET_FRAGMENT_PREFIX = 'widget-';

/** The URL fragment that names a widget, for a link that jumps straight to it. */
export function widgetFragment(widgetId: string): string {
  return `${WIDGET_FRAGMENT_PREFIX}${widgetId}`;
}

/** The widget id a URL fragment names, or null if it isn't one. */
export function widgetIdFromFragment(fragment: string | null): string | null {
  return fragment?.startsWith(WIDGET_FRAGMENT_PREFIX)
    ? fragment.slice(WIDGET_FRAGMENT_PREFIX.length)
    : null;
}
