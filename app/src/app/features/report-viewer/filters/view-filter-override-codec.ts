import { ViewFilterOverrides } from './view-filter-overrides';
import { WireGroup } from './wire-group';
import { ViewFilterWire } from './view-filter-wire';
import { Base64Url } from './base64-url';

export class ViewFilterOverrideCodec {
  /** Compact URL-safe encoding, or null when there's nothing to encode. */
  public static encode(overrides: ViewFilterOverrides): string | null {
    const entries = Object.entries(overrides);
    if (entries.length === 0) {
      return null;
    }

    const wire: Record<string, WireGroup | null> = {};
    for (const [key, group] of entries) {
      wire[key] = group && ViewFilterWire.fromGroup(group);
    }
    return Base64Url.encode(JSON.stringify(wire));
  }

  /** No param is no overrides (`{}`); an unreadable or malformed one is null, so it's ignored whole rather than half-applied. */
  public static decode(raw: string | null): ViewFilterOverrides | null {
    if (!raw) {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(Base64Url.decode(raw));
      if (!ViewFilterWire.isRecord(parsed)) {
        return null;
      }

      const overrides: ViewFilterOverrides = {};
      for (const [key, wire] of Object.entries(parsed)) {
        const group = wire === null ? null : ViewFilterWire.toGroup(wire);
        if (wire !== null && !group) {
          return null;
        }
        overrides[key] = group;
      }
      return overrides;
    } catch {
      return null;
    }
  }
}
