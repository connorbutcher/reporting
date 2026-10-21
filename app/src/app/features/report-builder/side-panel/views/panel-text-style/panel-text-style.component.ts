import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextAlign, TextFontWeight, TextVerticalAlign } from '../../../../../core/models/report';
import { StaticTextWidgetModel } from '../../../models/widget.model';
import { ReportSession } from '../../../state/report-session';
import { OptionCatalog } from '../../option-catalog';
import { SelectOption } from '../../select-option';
import { PanelGroupComponent } from '../../panel-group.component';

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
  private static readonly FONT_WEIGHT_OPTIONS: SelectOption<TextFontWeight>[] = [
    { label: 'Normal', value: 'normal' },
    { label: 'Medium', value: 'medium' },
    { label: 'Semibold', value: 'semibold' },
    { label: 'Bold', value: 'bold' },
  ];
  // The shared Left/Centre/Right, plus Justify which only text supports.
  private static readonly TEXT_ALIGN_OPTIONS: SelectOption<TextAlign>[] = [
    ...OptionCatalog.HORIZONTAL_ALIGN,
    { label: 'Justify', value: 'justify' },
  ];
  private static readonly VERTICAL_ALIGN_OPTIONS: SelectOption<TextVerticalAlign>[] = [
    { label: 'Top', value: 'top' },
    { label: 'Middle', value: 'middle' },
    { label: 'Bottom', value: 'bottom' },
  ];

  static readonly title = 'Style';

  private readonly session = inject(ReportSession);

  protected readonly fontWeightOptions = PanelTextStyleComponent.FONT_WEIGHT_OPTIONS;
  protected readonly textAlignOptions = PanelTextStyleComponent.TEXT_ALIGN_OPTIONS;
  protected readonly verticalAlignOptions = PanelTextStyleComponent.VERTICAL_ALIGN_OPTIONS;

  protected readonly widget = computed(() => {
    const widget = this.session.selectedWidget();
    return widget instanceof StaticTextWidgetModel ? widget : null;
  });
  protected readonly style = computed(() => this.widget()?.style ?? null);
}
