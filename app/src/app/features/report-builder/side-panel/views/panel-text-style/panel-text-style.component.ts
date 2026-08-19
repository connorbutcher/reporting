import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextAlign, TextFontWeight, TextVerticalAlign } from '../../../../../core/models/report.model';
import { StaticTextWidgetModel } from '../../../models/widget.model';
import { ReportBuilderStore } from '../../../report-builder.store';
import { PanelGroupComponent } from '../../panel-group.component';

const FONT_WEIGHT_OPTIONS: { label: string; value: TextFontWeight }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Medium', value: 'medium' },
  { label: 'Semibold', value: 'semibold' },
  { label: 'Bold', value: 'bold' },
];

const TEXT_ALIGN_OPTIONS: { label: string; value: TextAlign }[] = [
  { label: 'Left', value: 'left' },
  { label: 'Centre', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'Justify', value: 'justify' },
];

const VERTICAL_ALIGN_OPTIONS: { label: string; value: TextVerticalAlign }[] = [
  { label: 'Top', value: 'top' },
  { label: 'Middle', value: 'middle' },
  { label: 'Bottom', value: 'bottom' },
];

@Component({
  selector: 'app-panel-text-style',
  imports: [
    FormsModule,
    CheckboxModule,
    InputNumberModule,
    SelectButtonModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-text-style.component.html',
  styleUrl: './panel-text-style.component.scss',
})
export class PanelTextStyleComponent {
  private readonly store = inject(ReportBuilderStore);

  protected readonly fontWeightOptions = FONT_WEIGHT_OPTIONS;
  protected readonly textAlignOptions = TEXT_ALIGN_OPTIONS;
  protected readonly verticalAlignOptions = VERTICAL_ALIGN_OPTIONS;

  protected readonly widget = computed(() => {
    const widget = this.store.selectedWidget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });
  protected readonly style = computed(() => this.widget()?.style ?? null);
}
