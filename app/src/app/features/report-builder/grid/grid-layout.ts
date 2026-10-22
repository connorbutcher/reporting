import { GridRect } from './grid-rect';

/** Snap and collision maths for the report grid. */
export class GridLayout {
  /** Rows are short and fixed; columns stretch to the canvas width, measured at runtime. */
  public static readonly ROW_HEIGHT = 24;

  public static readonly GRID_GAP = 6;

  public static rectsOverlap(a: GridRect, b: GridRect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /** Rows down to the bottom of the lowest rect, so a read-only grid ends at its last widget. */
  public static usedRows(rects: readonly GridRect[]): number {
    return rects.reduce((rows, rect) => Math.max(rows, rect.y + rect.h), 1);
  }

  public static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /** Every target stays in bounds and clear of every other widget. */
  public static fitsWithoutCollision(
    targets: readonly { rect: GridRect }[],
    others: readonly { rect(): GridRect }[],
    gridColumns: number,
    gridRows: number,
  ): boolean {
    return targets.every(
      ({ rect }) =>
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.w <= gridColumns &&
        rect.y + rect.h <= gridRows &&
        !others.some((other) => GridLayout.rectsOverlap(rect, other.rect())),
    );
  }
}
