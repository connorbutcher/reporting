import { FilterGroup } from '../../../core/models/filter';
import { fromBase64Url, toBase64Url } from './base64url';
import { WireGroup, groupToWire, isRecord, wireToGroup } from './view-filter-wire';

/** What a reader changed from the published filters, by entry key. `null` is a filter they cleared; untouched entries are absent. */
export type ViewFilterOverrides = Record<string, FilterGroup | null>;

/** Compact URL-safe encoding, or null when there's nothing to encode. */
export function encodeViewFilterOverrides(overrides: ViewFilterOverrides): string | null {
  const entries = Object.entries(overrides);
  if (entries.length === 0) return null;

  const wire: Record<string, WireGroup | null> = {};
  for (const [key, group] of entries) wire[key] = group && groupToWire(group);
  return toBase64Url(JSON.stringify(wire));
}

/** No param is no overrides (`{}`); an unreadable or malformed one is null, so it's ignored whole rather than half-applied. */
export function decodeViewFilterOverrides(raw: string | null): ViewFilterOverrides | null {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(fromBase64Url(raw));
    if (!isRecord(parsed)) return null;

    const overrides: ViewFilterOverrides = {};
    for (const [key, wire] of Object.entries(parsed)) {
      const group = wire === null ? null : wireToGroup(wire);
      if (wire !== null && !group) return null;
      overrides[key] = group;
    }
    return overrides;
  } catch {
    return null;
  }
}
