import { BlockSpan } from './block-span';

/** The innermost item whose text contains `position` — where a server error at that offset belongs. */
export function blockAtPosition(spans: ReadonlyMap<number, BlockSpan>, position: number): number | null {
  let best: number | null = null;
  let bestLength = Infinity;

  for (const [id, span] of spans) {
    const length = span.end - span.start;
    if (position >= span.start && position < Math.max(span.end, span.start + 1) && length < bestLength) {
      best = id;
      bestLength = length;
    }
  }

  return best;
}
