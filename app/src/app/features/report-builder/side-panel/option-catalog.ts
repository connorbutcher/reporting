/**
 * Shared option lists for the side panel's select controls, so the same choice
 * isn't spelled out (and kept in sync) in more than one panel. Panel-specific
 * lists still live with their panel; only genuinely shared ones belong here.
 */

/** A label/value pair for PrimeNG select and select-button controls. */
export interface SelectOption<T> {
  label: string;
  value: T;
}

/**
 * Left / Centre / Right — the horizontal-alignment choices shared by the column
 * and text panels. Text alignment adds "Justify" on top of these (see its panel).
 */
export const HORIZONTAL_ALIGN_OPTIONS: SelectOption<'left' | 'center' | 'right'>[] = [
  { label: 'Left', value: 'left' },
  { label: 'Centre', value: 'center' },
  { label: 'Right', value: 'right' },
];
