import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableDensity } from '../../../../../core/models/report';
import { ReportSession } from '../../../state/report-session';
import { PanelGroupComponent } from '../../panel-group.component';

@Component({
  selector: 'app-panel-table-appearance',
  imports: [
    FormsModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectButtonModule,
    PanelGroupComponent,
  ],
  templateUrl: './panel-table-appearance.component.html',
})
export class PanelTableAppearanceComponent {
  public static readonly title = 'Appearance';

  private static readonly DENSITY_OPTIONS: { label: string; value: TableDensity }[] = [
    { label: 'Compact', value: 'compact' },
    { label: 'Normal', value: 'normal' },
    { label: 'Roomy', value: 'comfortable' },
  ];

  public readonly densityOptions = PanelTableAppearanceComponent.DENSITY_OPTIONS;

  public readonly appearance = computed(
    () => this.session.selectedTableWidget()?.appearance ?? null,
  );

  public readonly showTitle = computed(() => this.session.selectedWidget()?.showTitle() ?? true);

  private readonly session = inject(ReportSession);

  public setShowTitle(value: boolean): void {
    this.session.selectedWidget()?.showTitle.set(value);
  }
}
