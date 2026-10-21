import { ChartZoomRange } from './models/chart-zoom-range';

/**
 * Remembers each chart's X zoom in sessionStorage so reloads and filter changes keep it. Storage
 * can be unavailable, so every access is guarded.
 */
export class ChartZoomMemory {
  /** The id of a point chart's Y zoom, so a remembered X window isn't applied to it. */
  public static readonly VALUE_ZOOM_ID = 'value-zoom';

  private static readonly PREFIX = 'chart-zoom:';

  public static read(key: string | null): ChartZoomRange | null {
    if (!key) return null;
    try {
      const raw = sessionStorage.getItem(ChartZoomMemory.PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<ChartZoomRange>;
      return typeof parsed.start === 'number' && typeof parsed.end === 'number'
        ? { start: parsed.start, end: parsed.end }
        : null;
    } catch {
      return null;
    }
  }

  public static write(key: string | null, range: ChartZoomRange | null): void {
    if (!key) return;
    try {
      const full = !range || (range.start <= 0 && range.end >= 100);
      if (full) sessionStorage.removeItem(ChartZoomMemory.PREFIX + key);
      else sessionStorage.setItem(ChartZoomMemory.PREFIX + key, JSON.stringify(range));
    } catch {
      // Storage blocked or full: the zoom just isn't remembered.
    }
  }

  /** The window a `datazoom` event describes (the first of a batch), or null without percentages. */
  public static fromEvent(event: unknown): ChartZoomRange | null {
    const e = event as {
      start?: number;
      end?: number;
      batch?: { start?: number; end?: number }[];
    } | null;
    const source = e?.batch?.[0] ?? e;
    return typeof source?.start === 'number' && typeof source?.end === 'number'
      ? { start: source.start, end: source.end }
      : null;
  }

  public static apply<T extends { dataZoom?: unknown }>(
    option: T,
    range: ChartZoomRange | null,
  ): T {
    if (!range || !Array.isArray(option.dataZoom)) return option;
    const dataZoom = (option.dataZoom as Record<string, unknown>[]).map((zoom) =>
      zoom['id'] === ChartZoomMemory.VALUE_ZOOM_ID
        ? zoom
        : { ...zoom, start: range.start, end: range.end },
    );
    return { ...option, dataZoom };
  }
}
