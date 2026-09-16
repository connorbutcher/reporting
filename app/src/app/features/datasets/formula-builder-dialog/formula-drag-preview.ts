import { FormulaBlock } from './formula-block.model';
import { PaletteItem } from './formula-palette-item';

type DragVariant = 'column' | 'operator' | 'function' | 'value';

interface DragPreviewSpec {
  text: string;
  icon?: string;
  variant: DragVariant;
}

const VARIANT_STYLE: Record<DragVariant, { bg: string; border: string; color: string }> = {
  column: { bg: '#eef2ff', border: '#c7d2fe', color: '#3730a3' },
  operator: { bg: '#f1f5f9', border: '#cbd5e1', color: '#334155' },
  function: { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
  value: { bg: '#ffffff', border: '#cbd5e1', color: '#1f2937' },
};

/**
 * Sets a crisp, custom drag image for a native HTML5 drag, replacing the browser's default (which
 * rasterizes the source element as-is — tiny and hard to read for a compact chip, and for a
 * function chip would try to snapshot its whole nested argument tree rather than just naming the
 * function). Built off-screen at a fixed, comfortable size, handed to `setDragImage` — which
 * snapshots it synchronously — then discarded shortly after.
 *
 * Purely cosmetic and never allowed to affect the drag itself: every DOM/API interaction here is
 * wrapped so a failure (an unusual browser, a `setDragImage` quirk) can only mean the browser's own
 * default drag image is used instead — never a drag that fails to start or complete. Callers must
 * still commit the actual drag state (`FormulaBuilderStore.startDragBlock`/`startDragFromPalette`)
 * *before* calling this, not after, for the same reason.
 */
function showDragImage(event: DragEvent, spec: DragPreviewSpec): void {
  try {
    const dt = event.dataTransfer;
    if (!dt) return;
    const style = VARIANT_STYLE[spec.variant];

    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 0;
      left: -1000px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 260px;
      padding: 7px 12px;
      border-radius: 8px;
      border: 1.5px solid ${style.border};
      background: ${style.bg};
      color: ${style.color};
      font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2), 0 2px 6px rgba(15, 23, 42, 0.1);
      pointer-events: none;
    `;
    if (spec.icon) {
      const icon = document.createElement('i');
      icon.className = spec.icon;
      icon.style.fontSize = '12px';
      el.appendChild(icon);
    }
    const label = document.createElement('span');
    label.textContent = spec.text;
    el.appendChild(label);

    document.body.appendChild(el);
    // A small, non-negative offset — spec-safe across browsers (the offset is a position *within*
    // the image) — puts the cursor near the image's top-left corner rather than dead center, so the
    // label and the drop-indicator line (rendered at the real cursor position, elsewhere on screen)
    // don't sit on top of each other.
    dt.setDragImage(el, 12, 12);
    const cleanup = () => el.remove();
    // `requestAnimationFrame` can be throttled while a native drag is in progress on some browsers,
    // so back it with a timeout too — whichever fires first removes it; the other is then a no-op.
    requestAnimationFrame(cleanup);
    setTimeout(cleanup, 500);
  } catch {
    // Best-effort visual polish only — the browser's default drag image is a fine fallback.
  }
}

function blockSpec(block: FormulaBlock): DragPreviewSpec {
  switch (block.kind) {
    case 'column':
      return { text: block.columnName, icon: 'pi pi-table', variant: 'column' };
    case 'number':
      return { text: String(block.value), variant: 'value' };
    case 'text':
      return { text: `"${block.value}"`, variant: 'value' };
    case 'bool':
      return { text: block.value ? 'TRUE' : 'FALSE', variant: 'value' };
    case 'operator':
      return { text: block.op, variant: 'operator' };
    case 'function':
      // Dragging a function moves its whole argument subtree — "(…)" signals that at a glance
      // rather than trying to render the (possibly large) nested contents into the preview.
      return { text: `${block.name}(…)`, variant: 'function' };
  }
}

function paletteItemSpec(item: PaletteItem): DragPreviewSpec {
  switch (item.kind) {
    case 'column':
      return { text: item.column.name, icon: 'pi pi-table', variant: 'column' };
    case 'function':
      return { text: `${item.spec.name}(…)`, variant: 'function' };
    case 'operator':
      return { text: item.label, variant: 'operator' };
    case 'number':
      return { text: '123', variant: 'value' };
    case 'text':
      return { text: '"text"', variant: 'value' };
    case 'bool':
      return { text: 'TRUE/FALSE', variant: 'value' };
  }
}

export function setDragImageForBlock(event: DragEvent, block: FormulaBlock): void {
  showDragImage(event, blockSpec(block));
}

export function setDragImageForPaletteItem(event: DragEvent, item: PaletteItem): void {
  showDragImage(event, paletteItemSpec(item));
}
