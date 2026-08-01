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
