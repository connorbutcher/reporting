import { describe, expect, it } from 'vitest';
import { PanelColumnSettingsComponent } from './panel-column-settings.component';

describe('PanelColumnSettingsComponent', () => {
  it('previews every date format on 31 December', () => {
    const year = new Date().getFullYear();
    expect(PanelColumnSettingsComponent.DATE_FORMAT_OPTIONS).toEqual([
      { label: `31/12/${year}`, value: 'dd/MM/yyyy' },
      { label: `12/31/${year}`, value: 'MM/dd/yyyy' },
      { label: `${year}-12-31`, value: 'yyyy-MM-dd' },
      { label: `31 Dec ${year}`, value: 'd MMM yyyy' },
      { label: `31 December ${year}`, value: 'd MMMM yyyy' },
      { label: `31/12/${year} 14:30`, value: 'dd/MM/yyyy HH:mm' },
    ]);
  });
});
