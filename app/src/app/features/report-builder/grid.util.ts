export const CELL_SIZE = 80;
export const GRID_GAP = 8;

export interface GridRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridPreview extends GridRect {
  invalid: boolean;
}

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Whether every target rect stays in bounds and clear of every other widget's footprint. */
export function fitsWithoutCollision(
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
      !others.some((other) => rectsOverlap(rect, other.rect())),
  );
}
