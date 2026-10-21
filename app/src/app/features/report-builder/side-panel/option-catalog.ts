import { SelectOption } from './select-option';

/** Select options shared by more than one side-panel view; view-specific lists stay with their view. */
export class OptionCatalog {
  /** Shared by the column and text panels; text alignment adds "Justify". */
  public static readonly HORIZONTAL_ALIGN: SelectOption<'left' | 'center' | 'right'>[] = [
    { label: 'Left', value: 'left' },
    { label: 'Centre', value: 'center' },
    { label: 'Right', value: 'right' },
  ];
}
