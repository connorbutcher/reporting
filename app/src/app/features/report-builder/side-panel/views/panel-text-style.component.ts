import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextAlign, TextFontWeight, TextVerticalAlign } from '../../../../core/models/report.model';
import { StaticTextWidgetModel } from '../../models/widget.model';
import { ReportBuilderStore } from '../../report-builder.store';
import { PanelGroupComponent } from '../panel-group.component';

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
  imports: [FormsModule, CheckboxModule, InputNumberModule, SelectButtonModule, PanelGroupComponent],
  template: `
    @if (style(); as style) {
      <div class="panel-section">
        <app-panel-group label="Typography" icon="T">
          <label class="panel-field">
            <span class="panel-field-label">Font size (px)</span>
            <p-inputnumber
              [ngModel]="style.fontSize()"
              (ngModelChange)="style.fontSize.set($event ?? 16)"
              [min]="8"
              [max]="200"
              [showButtons]="true"
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              fluid
            />
          </label>

          <label class="panel-field">
            <span class="panel-field-label">Weight</span>
            <p-selectbutton
              [options]="fontWeightOptions"
              [ngModel]="style.fontWeight()"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
              (ngModelChange)="style.fontWeight.set($event)"
            />
          </label>

          <div class="panel-style-toggles">
            <label class="panel-toggle-button" [class.panel-toggle-button--active]="style.italic()">
              <input type="checkbox" [ngModel]="style.italic()" (ngModelChange)="style.italic.set($event)" />
              <i class="pi pi-italic" aria-hidden="true"></i>
            </label>
            <label class="panel-toggle-button" [class.panel-toggle-button--active]="style.underline()">
              <input
                type="checkbox"
                [ngModel]="style.underline()"
                (ngModelChange)="style.underline.set($event)"
              />
              <i class="pi pi-underline" aria-hidden="true"></i>
            </label>
            <label class="panel-toggle-button" [class.panel-toggle-button--active]="style.strikethrough()">
              <input
                type="checkbox"
                [ngModel]="style.strikethrough()"
                (ngModelChange)="style.strikethrough.set($event)"
              />
              <i class="pi pi-minus" aria-hidden="true"></i>
            </label>
          </div>
        </app-panel-group>

        <app-panel-group label="Alignment" icon="＋">
          <label class="panel-field">
            <span class="panel-field-label">Text alignment</span>
            <p-selectbutton
              [options]="textAlignOptions"
              [ngModel]="style.textAlign()"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
              (ngModelChange)="style.textAlign.set($event)"
            />
          </label>

          <label class="panel-field">
            <span class="panel-field-label">Vertical alignment</span>
            <p-selectbutton
              [options]="verticalAlignOptions"
              [ngModel]="style.verticalAlign()"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
              (ngModelChange)="style.verticalAlign.set($event)"
            />
          </label>
        </app-panel-group>

        <app-panel-group label="Appearance" icon="◐">
          <div class="panel-grid-fields">
            <label class="panel-field">
              <span class="panel-field-label">Text colour</span>
              <input
                class="panel-color-input"
                type="color"
                [ngModel]="style.color()"
                (ngModelChange)="style.color.set($event)"
              />
            </label>
            <label class="panel-field">
              <span class="panel-field-label">Line height</span>
              <p-inputnumber
                [ngModel]="style.lineHeight()"
                (ngModelChange)="style.lineHeight.set($event ?? 1.4)"
                [min]="0.8"
                [max]="4"
                [step]="0.1"
                [minFractionDigits]="1"
                [maxFractionDigits]="2"
                fluid
              />
            </label>
          </div>

          <div class="panel-inline-field">
            <p-checkbox
              [binary]="true"
              inputId="text-bg-enabled"
              [ngModel]="style.backgroundColor() !== null"
              (onChange)="style.setBackgroundEnabled($event.checked)"
            />
            <label for="text-bg-enabled">Background colour</label>
          </div>
          @if (style.backgroundColor(); as background) {
            <input
              class="panel-color-input"
              type="color"
              [ngModel]="background"
              (ngModelChange)="style.backgroundColor.set($event)"
            />
          }
        </app-panel-group>

        <app-panel-group label="Layout" icon="▤">
          <div class="panel-inline-field">
            <p-checkbox
              [binary]="true"
              inputId="text-wrap"
              [ngModel]="style.wrap()"
              (onChange)="style.wrap.set($event.checked)"
            />
            <label for="text-wrap">Wrap long lines</label>
          </div>

          <label class="panel-field">
            <span class="panel-field-label">Padding (px)</span>
            <p-inputnumber
              [ngModel]="style.padding()"
              (ngModelChange)="style.padding.set($event ?? 0)"
              [min]="0"
              [max]="100"
              [showButtons]="true"
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              fluid
            />
          </label>

          @if (widget(); as widget) {
            <div class="panel-inline-field">
              <p-checkbox
                [binary]="true"
                inputId="text-show-title"
                [ngModel]="widget.showTitle()"
                (onChange)="widget.showTitle.set($event.checked)"
              />
              <label for="text-show-title">Show header bar</label>
            </div>
          }
        </app-panel-group>
      </div>
    }
  `,
  styles: `
    .panel-style-toggles {
      display: flex;
      gap: 6px;
    }

    .panel-toggle-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 32px;
      border: 1px solid var(--app-card-border);
      border-radius: 6px;
      background: #fff;
      color: #475569;
      cursor: pointer;

      input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      &--active {
        border-color: var(--app-navy, #152a55);
        background: var(--p-primary-50, #eef3fa);
        color: var(--app-navy, #152a55);
      }
    }

    .panel-color-input {
      width: 100%;
      height: 32px;
      padding: 2px;
      border: 1px solid var(--app-card-border);
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
    }
  `,
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
