export class WidgetFragment {
  private static readonly PREFIX = 'widget-';

  /** The URL fragment that names a widget, for a link that jumps straight to it. */
  public static forWidget(widgetId: string): string {
    return `${WidgetFragment.PREFIX}${widgetId}`;
  }

  /** The widget id a URL fragment names, or null if it isn't one. */
  public static widgetId(fragment: string | null): string | null {
    return fragment?.startsWith(WidgetFragment.PREFIX)
      ? fragment.slice(WidgetFragment.PREFIX.length)
      : null;
  }
}
