import { SeriesColors } from './series-colors';

/**
 * Assigns each series a palette colour keyed by its label and remembers it across renders,
 * so adding or removing one series never reshuffles the others. A label's first choice is a
 * colour hashed from the label itself, so "Supplier A" gets the same colour in every chart on a
 * report unless two labels in one chart collide. Owned by the chart component (one per chart)
 * and re-resolved on every option rebuild.
 */
export class SeriesPalette {
  private readonly assigned = new Map<string, string>();

  /** A small, stable string hash (FNV-1a), so a label maps to the same palette slot everywhere. */
  private static hash(label: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < label.length; i++) {
      h ^= label.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /** The colour map for the given series labels, in draw order. */
  public resolve(labels: readonly string[]): Map<string, string> {
    // Drop colours for series no longer plotted, freeing them for reuse.
    const wanted = new Set(labels);
    for (const key of [...this.assigned.keys()]) if (!wanted.has(key)) this.assigned.delete(key);

    for (const label of labels) {
      if (this.assigned.has(label)) continue;
      // The label's own hashed colour, else the next one along not already taken; once all are in
      // use, keep the hashed one.
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
