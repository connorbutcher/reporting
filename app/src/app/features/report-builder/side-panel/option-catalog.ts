import { SelectOption } from './select-option';

/** Select options shared by more than one side-panel view; view-specific lists stay with their view. */
export class OptionCatalog {
  /**
   * Left / Centre / Right — the horizontal-alignment choices shared by the column
   * and text panels. Text alignment adds "Justify" on top of these (see its panel).
   */
  public static readonly HORIZONTAL_ALIGN: SelectOption<'left' | 'center' | 'right'>[] = [
    { label: 'Left', value: 'left' },
    { label: 'Centre', value: 'center' },
    { label: 'Right', value: 'right' },
  ];
}
