import { SeriesColors } from './series-colors';

/**
 * Remembers each series' colour across renders so series never reshuffle. A label first tries a
 * colour hashed from itself, so it matches across charts unless labels collide.
 */
export class SeriesPalette {
  private readonly assigned = new Map<string, string>();

  /** FNV-1a. */
  private static hash(label: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < label.length; i++) {
      h ^= label.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  public resolve(labels: readonly string[]): Map<string, string> {
    // Drop colours for series no longer plotted, freeing them for reuse.
    const wanted = new Set(labels);
    for (const key of [...this.assigned.keys()]) {
      if (!wanted.has(key)) {
        this.assigned.delete(key);
      }
    }

    for (const label of labels) {
      if (this.assigned.has(label)) {
        continue;
      }
      // Hashed colour, else the next free one; once all are taken, keep the hashed one.
      const used = new Set(this.assigned.values());
      const palette = SeriesColors.PALETTE;
      const start = SeriesPalette.hash(label) % palette.length;
      let chosen = palette[start];
      for (let k = 0; k < palette.length; k++) {
        const candidate = palette[(start + k) % palette.length];
        if (!used.has(candidate)) {
          chosen = candidate;
          break;
        }
      }
      this.assigned.set(label, chosen);
    }
    return new Map(this.assigned);
  }
}
