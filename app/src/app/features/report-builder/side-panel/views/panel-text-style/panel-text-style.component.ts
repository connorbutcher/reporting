import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextAlign, TextFontWeight, TextVerticalAlign } from '../../../../../core/models/report';
import { StaticTextWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { HORIZONTAL_ALIGN_OPTIONS, SelectOption } from '../../option-catalog';
import { PanelGroupComponent } from '../../panel-group.component';

const FONT_WEIGHT_OPTIONS: SelectOption<TextFontWeight>[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Medium', value: 'medium' },
  { label: 'Semibold', value: 'semibold' },
  { label: 'Bold', value: 'bold' },
];

// The shared Left/Centre/Right, plus Justify which only text supports.
const TEXT_ALIGN_OPTIONS: SelectOption<TextAlign>[] = [
  ...HORIZONTAL_ALIGN_OPTIONS,
  { label: 'Justify', value: 'justify' },
];

const VERTICAL_ALIGN_OPTIONS: SelectOption<TextVerticalAlign>[] = [
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
  static readonly title = 'Style';

  private readonly session = inject(ReportSession);

  protected readonly fontWeightOptions = FONT_WEIGHT_OPTIONS;
  protected readonly textAlignOptions = TEXT_ALIGN_OPTIONS;
  protected readonly verticalAlignOptions = VERTICAL_ALIGN_OPTIONS;

  protected readonly widget = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });
  protected readonly style = computed(() => this.widget()?.style ?? null);
}
